"""Create and compare CorpusSnapshot objects."""
import hashlib
import uuid
from datetime import datetime

from blind_engine.models import CoverageResult, CorpusSnapshot, SigmaRule, SnapshotDiff


def _corpus_hash(rules: list[SigmaRule], coverage: list[CoverageResult]) -> str:
    """Deterministic hash over rule IDs + per-technique coverage scores."""
    rule_part = "|".join(sorted(r.id for r in rules))
    cov_part = "|".join(
        f"{c.technique_id}:{c.coverage_score:.4f}"
        for c in sorted(coverage, key=lambda c: c.technique_id)
    )
    raw = f"{rule_part}::{cov_part}".encode()
    return hashlib.sha256(raw).hexdigest()[:24]


def create_snapshot(
    corpus_id: str,
    rules: list[SigmaRule],
    coverage: list[CoverageResult],
    label: str = "Snapshot",
    attack_version: str = "unknown",
) -> CorpusSnapshot:
    """Build a CorpusSnapshot from the current analysis state."""
    covered = [c for c in coverage if c.coverage_score > 0]
    mean_score = sum(c.coverage_score for c in coverage) / len(coverage) if coverage else 0.0
    return CorpusSnapshot(
        snapshot_id=str(uuid.uuid4()),
        corpus_id=corpus_id,
        label=label,
        attack_version=attack_version,
        rule_count=len(rules),
        technique_coverage_count=len(covered),
        mean_coverage_score=round(mean_score, 2),
        content_hash=_corpus_hash(rules, coverage),
        created_at=datetime.utcnow(),
    )


def compare_snapshots(
    snap_a: CorpusSnapshot,
    snap_b: CorpusSnapshot,
    rules_a: list[SigmaRule],
    rules_b: list[SigmaRule],
    coverage_a: list[CoverageResult],
    coverage_b: list[CoverageResult],
) -> SnapshotDiff:
    """Compute a SnapshotDiff between two corpus snapshots."""
    ids_a = {r.id for r in rules_a}
    ids_b = {r.id for r in rules_b}
    hashes_a = {r.id: r.content_hash for r in rules_a}
    hashes_b = {r.id: r.content_hash for r in rules_b}

    added = sorted(ids_b - ids_a)
    removed = sorted(ids_a - ids_b)
    modified = sorted(
        rid for rid in (ids_a & ids_b) if hashes_a.get(rid) != hashes_b.get(rid)
    )

    cov_a_by_tech = {c.technique_id: c for c in coverage_a}
    cov_b_by_tech = {c.technique_id: c for c in coverage_b}
    all_techs = set(cov_a_by_tech) | set(cov_b_by_tech)

    new_mappings: list[str] = []
    removed_mappings: list[str] = []
    newly_covered: list[str] = []
    newly_gapped: list[str] = []

    for tid in sorted(all_techs):
        a = cov_a_by_tech.get(tid)
        b = cov_b_by_tech.get(tid)

        a_rule_ids = set(a.mapped_rule_ids) if a else set()
        b_rule_ids = set(b.mapped_rule_ids) if b else set()

        if b_rule_ids - a_rule_ids:
            new_mappings.append(tid)
        if a_rule_ids - b_rule_ids:
            removed_mappings.append(tid)

        a_covered = bool(a and a.coverage_score > 0)
        b_covered = bool(b and b.coverage_score > 0)
        if b_covered and not a_covered:
            newly_covered.append(tid)
        if a_covered and not b_covered:
            newly_gapped.append(tid)

    coverage_delta = round(snap_b.mean_coverage_score - snap_a.mean_coverage_score, 2)
    version_compat = snap_a.attack_version == snap_b.attack_version

    return SnapshotDiff(
        snapshot_a_id=snap_a.snapshot_id,
        snapshot_b_id=snap_b.snapshot_id,
        added_rule_ids=added,
        removed_rule_ids=removed,
        modified_rule_ids=modified,
        new_technique_mappings=new_mappings,
        removed_technique_mappings=removed_mappings,
        newly_covered_techniques=newly_covered,
        newly_gapped_techniques=newly_gapped,
        coverage_delta=coverage_delta,
        attack_version_compatible=version_compat,
    )
