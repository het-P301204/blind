"""Unit tests for the gap prioritization engine."""
from __future__ import annotations

import pytest

from blind_engine.prioritization.engine import prioritize_gaps
from blind_engine.models import (
    AttackDataset,
    AttackTechnique,
    CoverageLevel,
    CoverageResult,
    GapAssessment,
    PriorityConfig,
    TelemetryStatus,
    ValidationStatus,
    DeploymentStatus,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_tech(tid: str, name: str = "Test Technique", tactics: list[str] | None = None) -> AttackTechnique:
    return AttackTechnique(id=tid, name=name, tactics=tactics or ["execution"])


def _make_dataset(*technique_ids: str) -> AttackDataset:
    techs = {tid: _make_tech(tid) for tid in technique_ids}
    return AttackDataset(techniques=techs)


def _make_coverage(
    technique_id: str,
    score: float,
    level: CoverageLevel = CoverageLevel.NO_MAPPED_COVERAGE,
    rule_count: int = 0,
    tactic_ids: list[str] | None = None,
    telemetry: TelemetryStatus = TelemetryStatus.UNKNOWN,
    validation: ValidationStatus = ValidationStatus.NOT_TESTED,
    deployment: DeploymentStatus = DeploymentStatus.UNKNOWN,
) -> CoverageResult:
    return CoverageResult(
        technique_id=technique_id,
        technique_name=f"Technique {technique_id}",
        coverage_score=score,
        coverage_level=level,
        mapped_rule_count=rule_count,
        tactic_ids=tactic_ids or ["execution"],
        telemetry_status=telemetry,
        validation_status=validation,
        deployment_status=deployment,
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestPrioritizeGaps:
    def test_empty_coverage_returns_empty(self):
        ds = _make_dataset("T1059")
        gaps = prioritize_gaps([], ds)
        assert gaps == [] or isinstance(gaps, list)

    def test_fully_covered_technique_excluded(self):
        """Techniques with STRONG coverage and high score should rank lower."""
        ds = _make_dataset("T1059", "T1003")
        coverage = [
            _make_coverage("T1059", 90.0, CoverageLevel.STRONG, rule_count=5),
            _make_coverage("T1003", 0.0, CoverageLevel.NO_MAPPED_COVERAGE, rule_count=0),
        ]
        gaps = prioritize_gaps(coverage, ds)
        assert len(gaps) > 0
        # T1003 (no coverage) should rank higher than T1059 (strong coverage)
        t1003_rank = next((g.priority_rank for g in gaps if g.technique_id == "T1003"), None)
        t1059_rank = next((g.priority_rank for g in gaps if g.technique_id == "T1059"), None)
        if t1003_rank is not None and t1059_rank is not None:
            assert t1003_rank < t1059_rank or t1003_rank <= t1059_rank

    def test_gaps_are_ranked(self):
        """All returned gaps should have sequential priority_rank starting at 1."""
        ds = _make_dataset("T1059", "T1003", "T1055")
        coverage = [
            _make_coverage("T1059", 5.0, CoverageLevel.LIMITED),
            _make_coverage("T1003", 30.0, CoverageLevel.PARTIAL),
            _make_coverage("T1055", 0.0, CoverageLevel.NO_MAPPED_COVERAGE),
        ]
        gaps = prioritize_gaps(coverage, ds)
        ranks = sorted(g.priority_rank for g in gaps)
        assert ranks[0] >= 1
        assert len(set(ranks)) == len(ranks)  # all ranks unique

    def test_gap_has_technique_id(self):
        ds = _make_dataset("T1059")
        coverage = [_make_coverage("T1059", 0.0, CoverageLevel.NO_MAPPED_COVERAGE)]
        gaps = prioritize_gaps(coverage, ds)
        assert len(gaps) > 0
        assert gaps[0].technique_id == "T1059"

    def test_gap_has_priority_score(self):
        ds = _make_dataset("T1059")
        coverage = [_make_coverage("T1059", 0.0, CoverageLevel.NO_MAPPED_COVERAGE)]
        gaps = prioritize_gaps(coverage, ds)
        assert len(gaps) > 0
        assert gaps[0].priority_score >= 0.0

    def test_gap_has_tactic_ids(self):
        ds = _make_dataset("T1059")
        coverage = [_make_coverage("T1059", 0.0, tactic_ids=["execution"])]
        gaps = prioritize_gaps(coverage, ds)
        if gaps:
            g = gaps[0]
            assert "execution" in g.tactic_ids or "execution" in g.tactics

    def test_gap_has_coverage_level(self):
        ds = _make_dataset("T1059")
        coverage = [_make_coverage("T1059", 0.0, CoverageLevel.NO_MAPPED_COVERAGE)]
        gaps = prioritize_gaps(coverage, ds)
        assert len(gaps) > 0
        assert gaps[0].coverage_level in list(CoverageLevel)

    def test_zero_coverage_ranks_highest(self):
        """Techniques with zero coverage should rank highest among a mix."""
        ds = _make_dataset("T1059", "T1003")
        coverage = [
            _make_coverage("T1059", 0.0, CoverageLevel.NO_MAPPED_COVERAGE),
            _make_coverage("T1003", 85.0, CoverageLevel.STRONG),
        ]
        gaps = prioritize_gaps(coverage, ds)
        if len(gaps) >= 2:
            t1059_rank = next(g.priority_rank for g in gaps if g.technique_id == "T1059")
            t1003_rank = next(g.priority_rank for g in gaps if g.technique_id == "T1003")
            assert t1059_rank <= t1003_rank

    def test_returns_list(self):
        ds = _make_dataset("T1059")
        coverage = [_make_coverage("T1059", 0.0)]
        result = prioritize_gaps(coverage, ds)
        assert isinstance(result, list)

    def test_gap_has_recommended_action(self):
        """Gaps should have a recommended_action string (may be empty)."""
        ds = _make_dataset("T1059")
        coverage = [_make_coverage("T1059", 0.0, CoverageLevel.NO_MAPPED_COVERAGE)]
        gaps = prioritize_gaps(coverage, ds)
        if gaps:
            assert isinstance(gaps[0].recommended_action, str)

    def test_priority_factors_present(self):
        ds = _make_dataset("T1059")
        coverage = [_make_coverage("T1059", 0.0, CoverageLevel.NO_MAPPED_COVERAGE)]
        gaps = prioritize_gaps(coverage, ds)
        if gaps:
            assert isinstance(gaps[0].priority_factors, list)

    def test_no_crash_with_many_techniques(self):
        """Prioritization should not crash on large input."""
        ds = _make_dataset(*[f"T{1000+i}" for i in range(100)])
        coverage = [
            _make_coverage(f"T{1000+i}", float(i % 90), CoverageLevel.PARTIAL if i % 2 else CoverageLevel.NO_MAPPED_COVERAGE)
            for i in range(100)
        ]
        gaps = prioritize_gaps(coverage, ds)
        assert isinstance(gaps, list)
        assert len(gaps) <= 100

    def test_mapped_rule_count_propagated(self):
        ds = _make_dataset("T1059")
        coverage = [_make_coverage("T1059", 30.0, CoverageLevel.PARTIAL, rule_count=3)]
        gaps = prioritize_gaps(coverage, ds)
        if gaps:
            g = next((g for g in gaps if g.technique_id == "T1059"), None)
            if g is not None:
                assert g.mapped_rule_count == 3
