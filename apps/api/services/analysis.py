"""Singleton service holding the BLIND platform's in-memory analysis state."""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

from blind_engine.models import (
    AttackDataset,
    CoverageResult,
    GapAssessment,
    IngestionJob,
    IngestionSummary,
    JobStatus,
    ParseStatus,
    SigmaRule,
)
from blind_engine.db.dal import Database


class AnalysisState:
    """Singleton holding the current analysis state across requests."""

    def __init__(self) -> None:
        self.db: Optional[Database] = None
        self.attack_dataset: Optional[AttackDataset] = None
        self.current_corpus_id: Optional[str] = None
        self.current_rules: list[SigmaRule] = []
        self.current_coverage: list[CoverageResult] = []
        self.current_gaps: list[GapAssessment] = []
        self.demo_loaded: bool = False
        self._lock = asyncio.Lock()
        self._ingesting: bool = False

    async def initialize(self, db_path: str = "~/.blind/blind.db") -> None:
        """Initialise the DB connection and create tables if needed."""
        self.db = Database()
        await self.db.initialize(db_path)

    async def load_attack_dataset_from_path(self, path: str) -> AttackDataset:
        """Load an ATT&CK STIX JSON bundle, store all techniques in the DB."""
        from blind_engine.attack.parser import load_attack_dataset

        dataset = load_attack_dataset(path)
        self.attack_dataset = dataset
        for tech in dataset.techniques.values():
            await self.db.upsert_technique(tech)
        return dataset

    async def run_ingestion(
        self,
        path: str,
        ingest_type: str,
        corpus_id: str,
        job: IngestionJob,
        is_demo: bool = False,
    ) -> None:
        """Full ingestion pipeline: parse → map → score → prioritise → persist."""
        from blind_engine.sigma.parser import parse_directory, parse_rule_file
        from blind_engine.mapping.mapper import map_rules_to_techniques
        from blind_engine.coverage.scorer import calculate_coverage
        from blind_engine.prioritization.engine import prioritize_gaps

        try:
            # ── Stage 1: Parse ────────────────────────────────────────────────
            async with self._lock:
                job.status = JobStatus.RUNNING
                job.progress_stage = "Parsing rules"
                job.progress_pct = 10
                await self.db.update_job(job)

            if ingest_type == "demo":
                from blind_engine.ingestion.demo import load_demo_data

                demo = load_demo_data(corpus_id=corpus_id)
                rules: list[SigmaRule] = demo["rules"]
                summary_obj: IngestionSummary = demo["summary"]
                attack_ds = demo["dataset"]
                async with self._lock:
                    if self.attack_dataset is None:
                        self.attack_dataset = attack_ds
                    self.demo_loaded = True
                # Store demo dataset techniques
                for tech in attack_ds.techniques.values():
                    await self.db.upsert_technique(tech)
                # Persist demo telemetry sources, validation records, and snapshots
                for ts in demo.get("telemetry_sources", []):
                    await self.db.upsert_telemetry(ts)
                for vr in demo.get("validation_records", []):
                    await self.db.upsert_validation(vr)
                for snap_key in ("snapshot_a", "snapshot_b"):
                    snap = demo.get(snap_key)
                    if snap is not None:
                        await self.db.save_snapshot(snap)

            elif ingest_type == "file":
                rule = parse_rule_file(path, corpus_id=corpus_id, is_demo=is_demo)
                rules = [rule]
                summary_obj = IngestionSummary(
                    corpus_id=corpus_id,
                    files_discovered=1,
                    successfully_parsed=1 if rule.parse_status == ParseStatus.PARSED else 0,
                    parsed_with_warnings=(
                        1 if rule.parse_status == ParseStatus.PARSED_WITH_WARNINGS else 0
                    ),
                    invalid_files=1 if rule.parse_status == ParseStatus.INVALID else 0,
                    total_rules=1,
                    rules_with_attack_tags=1 if rule.attack_technique_ids else 0,
                    completed_at=datetime.utcnow(),
                )

            else:  # directory (default)
                rules, summary_obj = parse_directory(
                    path, recursive=True, corpus_id=corpus_id, is_demo=is_demo
                )

            # ── Stage 2: Persist rules ────────────────────────────────────────
            async with self._lock:
                job.progress_stage = "Saving rules to database"
                job.progress_pct = 40
                await self.db.update_job(job)

            for rule in rules:
                await self.db.upsert_rule(rule)

            # ── Stage 3: Map + Score + Prioritise (only if dataset is loaded) ──
            if self.attack_dataset is None:
                async with self._lock:
                    self.current_corpus_id = corpus_id
                    self.current_rules = rules
                    job.status = JobStatus.COMPLETED
                    job.summary = summary_obj
                    job.progress_stage = "Done (no ATT&CK dataset; coverage skipped)"
                    job.progress_pct = 100
                    await self.db.update_job(job)
                return

            async with self._lock:
                job.progress_stage = "Mapping rules to ATT&CK techniques"
                job.progress_pct = 60
                await self.db.update_job(job)

            rules_by_id = {r.id: r for r in rules}
            mappings = map_rules_to_techniques(rules, self.attack_dataset)
            coverage = calculate_coverage(mappings, rules_by_id, self.attack_dataset)
            gaps = prioritize_gaps(coverage, self.attack_dataset)

            async with self._lock:
                job.progress_stage = "Persisting analysis results"
                job.progress_pct = 85
                await self.db.update_job(job)

            summary_obj.completed_at = datetime.utcnow()
            await self.db.save_coverage(coverage, corpus_id)
            await self.db.save_gaps(gaps, corpus_id)

            async with self._lock:
                self.current_corpus_id = corpus_id
                self.current_rules = rules
                self.current_coverage = coverage
                self.current_gaps = gaps
                job.status = JobStatus.COMPLETED
                job.summary = summary_obj
                job.progress_stage = "Complete"
                job.progress_pct = 100
                await self.db.update_job(job)

        except Exception as exc:
            logger.exception("Ingestion job %s failed", job.job_id)
            async with self._lock:
                job.status = JobStatus.FAILED
                job.progress_stage = f"Error: {type(exc).__name__}"
                await self.db.update_job(job)
            raise
        finally:
            async with self._lock:
                self._ingesting = False


# ── Module-level singleton ─────────────────────────────────────────────────────

_state: Optional[AnalysisState] = None
_init_lock: Optional[asyncio.Lock] = None


async def get_state() -> AnalysisState:
    """Return the module-level AnalysisState singleton, initialising it once."""
    global _state, _init_lock
    # Lazily create the init lock in the running event loop
    if _init_lock is None:
        _init_lock = asyncio.Lock()
    async with _init_lock:
        if _state is None:
            state = AnalysisState()
            await state.initialize()
            _state = state
    return _state
