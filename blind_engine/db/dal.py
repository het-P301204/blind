"""Database Access Layer for the BLIND platform (aiosqlite-free, asyncio.to_thread)."""
import asyncio
import json
import sqlite3
import threading
from datetime import datetime
from pathlib import Path
from typing import Optional

from blind_engine.db.schema import create_tables
from blind_engine.models import (
    AttackDataSource,
    AttackTechnique,
    CoverageLevel,
    CoverageResult,
    DeploymentStatus,
    GapAssessment,
    IngestionJob,
    IngestionSummary,
    ParseStatus,
    PriorityFactor,
    SigmaLogSource,
    SigmaRule,
    TelemetrySource,
    TelemetryStatus,
    TechniqueMapping,
    ValidationRecord,
    ValidationStatus,
    CorpusSnapshot,
)


class Database:
    """Thread-safe SQLite wrapper that exposes an async interface."""

    def __init__(self) -> None:
        self._db_path: str = ""
        self._lock = threading.Lock()

    # ── Lifecycle ──────────────────────────────────────────────────────────────

    async def initialize(self, db_path: str = "~/.blind/blind.db") -> None:
        path = Path(db_path).expanduser()
        path.parent.mkdir(parents=True, exist_ok=True)
        self._db_path = str(path)

        def _init() -> None:
            conn = sqlite3.connect(self._db_path)
            try:
                create_tables(conn)
            finally:
                conn.close()

        await asyncio.to_thread(_init)

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        return conn

    # ── Sigma Rules ────────────────────────────────────────────────────────────

    async def upsert_rule(self, rule: SigmaRule) -> None:
        def _do() -> None:
            with self._lock:
                conn = self._connect()
                try:
                    conn.execute(
                        """
                        INSERT OR REPLACE INTO sigma_rules (
                            id, file_path, content_hash, parse_status, parse_warnings,
                            title, description, author, status, date, modified,
                            tags, attack_technique_ids, attack_tactic_tags, logsource,
                            detection_condition, falsepositives, rule_references, related,
                            is_demo, corpus_id, ingested_at
                        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                        """,
                        (
                            rule.id,
                            rule.file_path,
                            rule.content_hash,
                            rule.parse_status.value,
                            json.dumps(rule.parse_warnings),
                            rule.title,
                            rule.description,
                            rule.author,
                            rule.status,
                            rule.date,
                            rule.modified,
                            json.dumps(rule.tags),
                            json.dumps(rule.attack_technique_ids),
                            json.dumps(rule.attack_tactic_tags),
                            json.dumps(rule.logsource.model_dump()) if rule.logsource else None,
                            rule.detection_condition,
                            json.dumps(rule.falsepositives),
                            json.dumps(rule.references),
                            json.dumps(rule.related),
                            int(rule.is_demo),
                            rule.corpus_id,
                            rule.ingested_at.isoformat(),
                        ),
                    )
                    conn.commit()
                finally:
                    conn.close()

        await asyncio.to_thread(_do)

    async def get_rule(self, rule_id: str) -> Optional[SigmaRule]:
        def _do() -> Optional[dict]:
            with self._lock:
                conn = self._connect()
                try:
                    row = conn.execute(
                        "SELECT * FROM sigma_rules WHERE id = ?", (rule_id,)
                    ).fetchone()
                    return dict(row) if row else None
                finally:
                    conn.close()

        row = await asyncio.to_thread(_do)
        return _row_to_rule(row) if row else None

    async def list_rules(
        self,
        corpus_id: Optional[str] = None,
        technique_id: Optional[str] = None,
        status: Optional[str] = None,
        maturity: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[SigmaRule]:
        def _do() -> list[dict]:
            with self._lock:
                conn = self._connect()
                try:
                    clauses: list[str] = []
                    params: list = []
                    if corpus_id:
                        clauses.append("corpus_id = ?")
                        params.append(corpus_id)
                    if status:
                        clauses.append("parse_status = ?")
                        params.append(status)
                    if maturity:
                        clauses.append("status = ?")
                        params.append(maturity)
                    where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
                    rows = conn.execute(
                        f"SELECT * FROM sigma_rules {where} ORDER BY ingested_at DESC LIMIT ? OFFSET ?",
                        params + [limit, skip],
                    ).fetchall()
                    return [dict(r) for r in rows]
                finally:
                    conn.close()

        rows = await asyncio.to_thread(_do)
        rules = [_row_to_rule(r) for r in rows]
        if technique_id:
            tid = technique_id.upper()
            rules = [r for r in rules if tid in [t.upper() for t in r.attack_technique_ids]]
        return rules

    async def count_rules(self, corpus_id: Optional[str] = None) -> int:
        def _do() -> int:
            with self._lock:
                conn = self._connect()
                try:
                    if corpus_id:
                        return conn.execute(
                            "SELECT COUNT(*) FROM sigma_rules WHERE corpus_id = ?",
                            (corpus_id,),
                        ).fetchone()[0]
                    return conn.execute("SELECT COUNT(*) FROM sigma_rules").fetchone()[0]
                finally:
                    conn.close()

        return await asyncio.to_thread(_do)

    # ── ATT&CK Techniques ─────────────────────────────────────────────────────

    async def upsert_technique(self, tech: AttackTechnique) -> None:
        def _do() -> None:
            with self._lock:
                conn = self._connect()
                try:
                    conn.execute(
                        """
                        INSERT OR REPLACE INTO attack_techniques (
                            id, name, description, tactics, platforms, data_sources,
                            is_subtechnique, parent_id, subtechnique_ids,
                            is_deprecated, is_revoked, external_references,
                            dataset_version, detection_guidance
                        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                        """,
                        (
                            tech.id,
                            tech.name,
                            tech.description,
                            json.dumps(tech.tactics),
                            json.dumps(tech.platforms),
                            json.dumps([ds.model_dump() for ds in tech.data_sources]),
                            int(tech.is_subtechnique),
                            tech.parent_id,
                            json.dumps(tech.subtechnique_ids),
                            int(tech.is_deprecated),
                            int(tech.is_revoked),
                            json.dumps(tech.external_references),
                            tech.dataset_version,
                            tech.detection_guidance,
                        ),
                    )
                    conn.commit()
                finally:
                    conn.close()

        await asyncio.to_thread(_do)

    async def get_technique(self, technique_id: str) -> Optional[AttackTechnique]:
        def _do() -> Optional[dict]:
            with self._lock:
                conn = self._connect()
                try:
                    row = conn.execute(
                        "SELECT * FROM attack_techniques WHERE id = ?", (technique_id,)
                    ).fetchone()
                    return dict(row) if row else None
                finally:
                    conn.close()

        row = await asyncio.to_thread(_do)
        return _row_to_technique(row) if row else None

    async def list_techniques(self) -> list[AttackTechnique]:
        def _do() -> list[dict]:
            with self._lock:
                conn = self._connect()
                try:
                    rows = conn.execute(
                        "SELECT * FROM attack_techniques ORDER BY id"
                    ).fetchall()
                    return [dict(r) for r in rows]
                finally:
                    conn.close()

        rows = await asyncio.to_thread(_do)
        return [_row_to_technique(r) for r in rows]

    # ── Coverage Results ──────────────────────────────────────────────────────

    async def save_coverage(self, coverage: list[CoverageResult], corpus_id: str) -> None:
        def _do() -> None:
            with self._lock:
                conn = self._connect()
                try:
                    for cov in coverage:
                        conn.execute(
                            """
                            INSERT OR REPLACE INTO coverage_results (
                                technique_id, corpus_id, technique_name, tactics,
                                mapped_rule_count, mapped_rule_ids, coverage_score,
                                coverage_level, telemetry_status, validation_status,
                                deployment_status, maturity_distribution,
                                scoring_formula, computed_at
                            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                            """,
                            (
                                cov.technique_id,
                                corpus_id,
                                cov.technique_name,
                                json.dumps(cov.tactics),
                                cov.mapped_rule_count,
                                json.dumps(cov.mapped_rule_ids),
                                cov.coverage_score,
                                cov.coverage_level.value,
                                cov.telemetry_status.value,
                                cov.validation_status.value,
                                cov.deployment_status.value,
                                json.dumps(cov.maturity_distribution),
                                cov.scoring_formula,
                                cov.computed_at.isoformat(),
                            ),
                        )
                    conn.commit()
                finally:
                    conn.close()

        await asyncio.to_thread(_do)

    async def get_coverage(self, corpus_id: str) -> list[CoverageResult]:
        def _do() -> list[dict]:
            with self._lock:
                conn = self._connect()
                try:
                    rows = conn.execute(
                        "SELECT * FROM coverage_results WHERE corpus_id = ? ORDER BY technique_id",
                        (corpus_id,),
                    ).fetchall()
                    return [dict(r) for r in rows]
                finally:
                    conn.close()

        rows = await asyncio.to_thread(_do)
        return [_row_to_coverage(r) for r in rows]

    # ── Gap Assessments ───────────────────────────────────────────────────────

    async def save_gaps(self, gaps: list[GapAssessment], corpus_id: str) -> None:
        def _do() -> None:
            with self._lock:
                conn = self._connect()
                try:
                    for gap in gaps:
                        conn.execute(
                            """
                            INSERT OR REPLACE INTO gap_assessments (
                                technique_id, corpus_id, technique_name, tactics,
                                priority_score, priority_rank, priority_factors,
                                mapped_rule_count, coverage_score, coverage_level,
                                telemetry_status, deployment_status, validation_status,
                                recommended_action, telemetry_dependencies
                            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                            """,
                            (
                                gap.technique_id,
                                corpus_id,
                                gap.technique_name,
                                json.dumps(gap.tactics),
                                gap.priority_score,
                                gap.priority_rank,
                                json.dumps([pf.model_dump() for pf in gap.priority_factors]),
                                gap.mapped_rule_count,
                                gap.coverage_score,
                                gap.coverage_level.value,
                                gap.telemetry_status.value,
                                gap.deployment_status.value,
                                gap.validation_status.value,
                                gap.recommended_action,
                                json.dumps(gap.telemetry_dependencies),
                            ),
                        )
                    conn.commit()
                finally:
                    conn.close()

        await asyncio.to_thread(_do)

    async def get_gaps(
        self,
        corpus_id: str,
        min_score: Optional[float] = None,
        tactic: Optional[str] = None,
    ) -> list[GapAssessment]:
        def _do() -> list[dict]:
            with self._lock:
                conn = self._connect()
                try:
                    clauses = ["corpus_id = ?"]
                    params: list = [corpus_id]
                    if min_score is not None:
                        clauses.append("priority_score >= ?")
                        params.append(min_score)
                    where = "WHERE " + " AND ".join(clauses)
                    rows = conn.execute(
                        f"SELECT * FROM gap_assessments {where} ORDER BY priority_rank",
                        params,
                    ).fetchall()
                    return [dict(r) for r in rows]
                finally:
                    conn.close()

        rows = await asyncio.to_thread(_do)
        gaps = [_row_to_gap(r) for r in rows]
        if tactic:
            gaps = [g for g in gaps if tactic.lower() in [t.lower() for t in g.tactics]]
        return gaps

    # ── Telemetry Sources ─────────────────────────────────────────────────────

    async def upsert_telemetry(self, source: TelemetrySource) -> None:
        def _do() -> None:
            with self._lock:
                conn = self._connect()
                try:
                    conn.execute(
                        """
                        INSERT OR REPLACE INTO telemetry_sources (
                            id, name, platform, collection_status, coverage_scope,
                            last_verified, owner, notes, is_demo
                        ) VALUES (?,?,?,?,?,?,?,?,?)
                        """,
                        (
                            source.id,
                            source.name,
                            source.platform,
                            source.collection_status.value,
                            source.coverage_scope,
                            source.last_verified.isoformat() if source.last_verified else None,
                            source.owner,
                            source.notes,
                            int(source.is_demo),
                        ),
                    )
                    conn.commit()
                finally:
                    conn.close()

        await asyncio.to_thread(_do)

    async def list_telemetry(self) -> list[TelemetrySource]:
        def _do() -> list[dict]:
            with self._lock:
                conn = self._connect()
                try:
                    rows = conn.execute(
                        "SELECT * FROM telemetry_sources ORDER BY name"
                    ).fetchall()
                    return [dict(r) for r in rows]
                finally:
                    conn.close()

        rows = await asyncio.to_thread(_do)
        return [_row_to_telemetry(r) for r in rows]

    # ── Validation Records ────────────────────────────────────────────────────

    async def upsert_validation(self, record: ValidationRecord) -> None:
        def _do() -> None:
            with self._lock:
                conn = self._connect()
                try:
                    conn.execute(
                        """
                        INSERT OR REPLACE INTO validation_records (
                            id, technique_id, rule_id, objective,
                            required_telemetry, prerequisites, expected_evidence,
                            expected_detection, observed_result, analyst_notes,
                            remediation, status, tested_at, is_synthetic
                        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                        """,
                        (
                            record.id,
                            record.technique_id,
                            record.rule_id,
                            record.objective,
                            json.dumps(record.required_telemetry),
                            json.dumps(record.prerequisites),
                            record.expected_evidence,
                            record.expected_detection,
                            record.observed_result,
                            record.analyst_notes,
                            record.remediation,
                            record.status.value,
                            record.tested_at.isoformat() if record.tested_at else None,
                            int(record.is_synthetic),
                        ),
                    )
                    conn.commit()
                finally:
                    conn.close()

        await asyncio.to_thread(_do)

    async def list_validations(self) -> list[ValidationRecord]:
        def _do() -> list[dict]:
            with self._lock:
                conn = self._connect()
                try:
                    rows = conn.execute(
                        "SELECT * FROM validation_records ORDER BY technique_id"
                    ).fetchall()
                    return [dict(r) for r in rows]
                finally:
                    conn.close()

        rows = await asyncio.to_thread(_do)
        return [_row_to_validation(r) for r in rows]

    # ── Corpus Snapshots ──────────────────────────────────────────────────────

    async def save_snapshot(self, snap: CorpusSnapshot) -> None:
        def _do() -> None:
            with self._lock:
                conn = self._connect()
                try:
                    conn.execute(
                        """
                        INSERT OR REPLACE INTO corpus_snapshots (
                            snapshot_id, corpus_id, label, attack_version,
                            rule_count, technique_coverage_count, mean_coverage_score,
                            content_hash, created_at, is_demo
                        ) VALUES (?,?,?,?,?,?,?,?,?,?)
                        """,
                        (
                            snap.snapshot_id,
                            snap.corpus_id,
                            snap.label,
                            snap.attack_version,
                            snap.rule_count,
                            snap.technique_coverage_count,
                            snap.mean_coverage_score,
                            snap.content_hash,
                            snap.created_at.isoformat(),
                            int(snap.is_demo),
                        ),
                    )
                    conn.commit()
                finally:
                    conn.close()

        await asyncio.to_thread(_do)

    async def get_snapshot(self, snapshot_id: str) -> Optional[CorpusSnapshot]:
        def _do() -> Optional[dict]:
            with self._lock:
                conn = self._connect()
                try:
                    row = conn.execute(
                        "SELECT * FROM corpus_snapshots WHERE snapshot_id = ?",
                        (snapshot_id,),
                    ).fetchone()
                    return dict(row) if row else None
                finally:
                    conn.close()

        row = await asyncio.to_thread(_do)
        return _row_to_snapshot(row) if row else None

    async def list_snapshots(self) -> list[CorpusSnapshot]:
        def _do() -> list[dict]:
            with self._lock:
                conn = self._connect()
                try:
                    rows = conn.execute(
                        "SELECT * FROM corpus_snapshots ORDER BY created_at DESC"
                    ).fetchall()
                    return [dict(r) for r in rows]
                finally:
                    conn.close()

        rows = await asyncio.to_thread(_do)
        return [_row_to_snapshot(r) for r in rows]

    # ── Ingestion Jobs ────────────────────────────────────────────────────────

    async def save_job(self, job: IngestionJob) -> None:
        def _do() -> None:
            with self._lock:
                conn = self._connect()
                try:
                    conn.execute(
                        """
                        INSERT OR REPLACE INTO ingestion_jobs (
                            job_id, status, summary, progress_stage, progress_pct, created_at
                        ) VALUES (?,?,?,?,?,?)
                        """,
                        (
                            job.job_id,
                            job.status,
                            job.summary.model_dump_json() if job.summary else None,
                            job.progress_stage,
                            job.progress_pct,
                            job.created_at.isoformat(),
                        ),
                    )
                    conn.commit()
                finally:
                    conn.close()

        await asyncio.to_thread(_do)

    async def update_job(self, job: IngestionJob) -> None:
        await self.save_job(job)

    async def get_job(self, job_id: str) -> Optional[IngestionJob]:
        def _do() -> Optional[dict]:
            with self._lock:
                conn = self._connect()
                try:
                    row = conn.execute(
                        "SELECT * FROM ingestion_jobs WHERE job_id = ?", (job_id,)
                    ).fetchone()
                    return dict(row) if row else None
                finally:
                    conn.close()

        row = await asyncio.to_thread(_do)
        if not row:
            return None
        summary: Optional[IngestionSummary] = None
        if row.get("summary"):
            try:
                summary = IngestionSummary.model_validate_json(row["summary"])
            except Exception:
                pass
        return IngestionJob(
            job_id=row["job_id"],
            status=row["status"],
            summary=summary,
            progress_stage=row.get("progress_stage") or "",
            progress_pct=row.get("progress_pct") or 0,
            created_at=datetime.fromisoformat(row["created_at"]),
        )


# ── Row converters ─────────────────────────────────────────────────────────────

def _row_to_rule(row: dict) -> SigmaRule:
    logsource: Optional[SigmaLogSource] = None
    if row.get("logsource"):
        try:
            ls_data = json.loads(row["logsource"])
            logsource = SigmaLogSource(**ls_data)
        except Exception:
            pass
    return SigmaRule(
        id=row["id"],
        file_path=row["file_path"],
        content_hash=row["content_hash"],
        parse_status=ParseStatus(row["parse_status"]),
        parse_warnings=json.loads(row.get("parse_warnings") or "[]"),
        title=row.get("title"),
        description=row.get("description"),
        author=row.get("author"),
        status=row.get("status"),
        date=row.get("date"),
        modified=row.get("modified"),
        tags=json.loads(row.get("tags") or "[]"),
        attack_technique_ids=json.loads(row.get("attack_technique_ids") or "[]"),
        attack_tactic_tags=json.loads(row.get("attack_tactic_tags") or "[]"),
        logsource=logsource,
        detection_condition=row.get("detection_condition"),
        falsepositives=json.loads(row.get("falsepositives") or "[]"),
        references=json.loads(row.get("rule_references") or "[]"),
        related=json.loads(row.get("related") or "[]"),
        is_demo=bool(row.get("is_demo", 0)),
        corpus_id=row.get("corpus_id"),
        ingested_at=datetime.fromisoformat(row["ingested_at"]),
    )


def _row_to_technique(row: dict) -> AttackTechnique:
    data_sources_raw = json.loads(row.get("data_sources") or "[]")
    data_sources: list[AttackDataSource] = []
    for ds in data_sources_raw:
        if isinstance(ds, dict):
            data_sources.append(AttackDataSource(**ds))
        elif isinstance(ds, str):
            data_sources.append(AttackDataSource(name=ds))
    return AttackTechnique(
        id=row["id"],
        name=row["name"],
        description=row.get("description"),
        tactics=json.loads(row.get("tactics") or "[]"),
        platforms=json.loads(row.get("platforms") or "[]"),
        data_sources=data_sources,
        is_subtechnique=bool(row.get("is_subtechnique", 0)),
        parent_id=row.get("parent_id"),
        subtechnique_ids=json.loads(row.get("subtechnique_ids") or "[]"),
        is_deprecated=bool(row.get("is_deprecated", 0)),
        is_revoked=bool(row.get("is_revoked", 0)),
        external_references=json.loads(row.get("external_references") or "[]"),
        dataset_version=row.get("dataset_version") or "unknown",
        detection_guidance=row.get("detection_guidance"),
    )


def _row_to_coverage(row: dict) -> CoverageResult:
    return CoverageResult(
        technique_id=row["technique_id"],
        technique_name=row["technique_name"],
        tactics=json.loads(row.get("tactics") or "[]"),
        mapped_rule_count=row.get("mapped_rule_count", 0),
        mapped_rule_ids=json.loads(row.get("mapped_rule_ids") or "[]"),
        coverage_score=row.get("coverage_score", 0.0),
        coverage_level=CoverageLevel(row.get("coverage_level", "UNKNOWN")),
        telemetry_status=TelemetryStatus(row.get("telemetry_status", "UNKNOWN")),
        validation_status=ValidationStatus(row.get("validation_status", "NOT_TESTED")),
        deployment_status=DeploymentStatus(row.get("deployment_status", "UNKNOWN")),
        maturity_distribution=json.loads(row.get("maturity_distribution") or "{}"),
        scoring_formula=row.get("scoring_formula") or "",
        computed_at=datetime.fromisoformat(row["computed_at"]),
    )


def _row_to_gap(row: dict) -> GapAssessment:
    pf_raw = json.loads(row.get("priority_factors") or "[]")
    priority_factors = [PriorityFactor(**pf) for pf in pf_raw]
    return GapAssessment(
        technique_id=row["technique_id"],
        technique_name=row["technique_name"],
        tactics=json.loads(row.get("tactics") or "[]"),
        priority_score=row.get("priority_score", 0.0),
        priority_rank=row.get("priority_rank", 0),
        priority_factors=priority_factors,
        mapped_rule_count=row.get("mapped_rule_count", 0),
        coverage_score=row.get("coverage_score", 0.0),
        coverage_level=CoverageLevel(row.get("coverage_level", "UNKNOWN")),
        telemetry_status=TelemetryStatus(row.get("telemetry_status", "UNKNOWN")),
        deployment_status=DeploymentStatus(row.get("deployment_status", "UNKNOWN")),
        validation_status=ValidationStatus(row.get("validation_status", "NOT_TESTED")),
        recommended_action=row.get("recommended_action") or "",
        telemetry_dependencies=json.loads(row.get("telemetry_dependencies") or "[]"),
    )


def _row_to_telemetry(row: dict) -> TelemetrySource:
    return TelemetrySource(
        id=row["id"],
        name=row["name"],
        platform=row["platform"],
        collection_status=TelemetryStatus(row.get("collection_status", "UNKNOWN")),
        coverage_scope=row.get("coverage_scope"),
        last_verified=(
            datetime.fromisoformat(row["last_verified"]) if row.get("last_verified") else None
        ),
        owner=row.get("owner"),
        notes=row.get("notes"),
        is_demo=bool(row.get("is_demo", 0)),
    )


def _row_to_validation(row: dict) -> ValidationRecord:
    return ValidationRecord(
        id=row["id"],
        technique_id=row["technique_id"],
        rule_id=row.get("rule_id"),
        objective=row["objective"],
        required_telemetry=json.loads(row.get("required_telemetry") or "[]"),
        prerequisites=json.loads(row.get("prerequisites") or "[]"),
        expected_evidence=row.get("expected_evidence") or "",
        expected_detection=row.get("expected_detection") or "",
        observed_result=row.get("observed_result"),
        analyst_notes=row.get("analyst_notes"),
        remediation=row.get("remediation"),
        status=ValidationStatus(row.get("status", "NOT_TESTED")),
        tested_at=(
            datetime.fromisoformat(row["tested_at"]) if row.get("tested_at") else None
        ),
        is_synthetic=bool(row.get("is_synthetic", 1)),
    )


def _row_to_snapshot(row: dict) -> CorpusSnapshot:
    return CorpusSnapshot(
        snapshot_id=row["snapshot_id"],
        corpus_id=row["corpus_id"],
        label=row["label"],
        attack_version=row["attack_version"],
        rule_count=row.get("rule_count", 0),
        technique_coverage_count=row.get("technique_coverage_count", 0),
        mean_coverage_score=row.get("mean_coverage_score", 0.0),
        content_hash=row["content_hash"],
        created_at=datetime.fromisoformat(row["created_at"]),
        is_demo=bool(row.get("is_demo", 0)),
    )
