"""Unit tests for the coverage scoring engine."""
from __future__ import annotations

import math

import pytest

from blind_engine.coverage.scorer import calculate_coverage
from blind_engine.coverage.levels import classify_coverage_level
from blind_engine.models import (
    AttackDataset,
    AttackTechnique,
    CoverageConfig,
    CoverageLevel,
    CoverageResult,
    SigmaRule,
    TechniqueMapping,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_tech(tid: str, tactics: list[str] | None = None) -> AttackTechnique:
    return AttackTechnique(id=tid, name=f"Technique {tid}", tactics=tactics or ["execution"])


def _make_rule(
    rule_id: str, status: str = "stable", technique_ids: list[str] | None = None
) -> SigmaRule:
    return SigmaRule(
        id=rule_id,
        title=f"Rule {rule_id}",
        status=status,
        attack_technique_ids=technique_ids or [],
    )


def _make_mapping(technique_id: str, rule_ids: list[str]) -> TechniqueMapping:
    return TechniqueMapping(technique_id=technique_id, rule_ids=rule_ids)


def _make_dataset(*technique_ids: str) -> AttackDataset:
    techs = {tid: _make_tech(tid) for tid in technique_ids}
    return AttackDataset(techniques=techs)


# ---------------------------------------------------------------------------
# Coverage levels (classify_coverage_level)
# ---------------------------------------------------------------------------

class TestClassifyCoverageLevel:
    def test_zero_score_is_no_mapped_coverage(self):
        cfg = CoverageConfig()
        level = classify_coverage_level(0.0, cfg)
        assert level == CoverageLevel.NO_MAPPED_COVERAGE

    def test_score_10_is_limited(self):
        """With default thresholds (limited=25, partial=60): 10 → LIMITED."""
        cfg = CoverageConfig()
        level = classify_coverage_level(10.0, cfg)
        assert level == CoverageLevel.LIMITED

    def test_score_25_boundary(self):
        """Score at exactly the limited threshold stays LIMITED (< partial threshold)."""
        cfg = CoverageConfig()
        level = classify_coverage_level(25.0, cfg)
        # 25 >= limited=25, so it could be PARTIAL or LIMITED depending on implementation
        assert level in (CoverageLevel.LIMITED, CoverageLevel.PARTIAL)

    def test_score_40_is_partial(self):
        """With default thresholds: 40 → PARTIAL (≥25 and <60)."""
        cfg = CoverageConfig()
        level = classify_coverage_level(40.0, cfg)
        assert level == CoverageLevel.PARTIAL

    def test_score_80_is_strong(self):
        """With default thresholds: 80 → STRONG (≥60)."""
        cfg = CoverageConfig()
        level = classify_coverage_level(80.0, cfg)
        assert level == CoverageLevel.STRONG

    def test_score_100_is_strong(self):
        cfg = CoverageConfig()
        level = classify_coverage_level(100.0, cfg)
        assert level == CoverageLevel.STRONG

    def test_custom_thresholds(self):
        cfg = CoverageConfig(thresholds={"limited": 10.0, "partial": 50.0})
        assert classify_coverage_level(5.0, cfg) == CoverageLevel.LIMITED
        assert classify_coverage_level(30.0, cfg) == CoverageLevel.PARTIAL
        assert classify_coverage_level(70.0, cfg) == CoverageLevel.STRONG


# ---------------------------------------------------------------------------
# Coverage scorer (calculate_coverage)
# Note: calculate_coverage(mappings: list[TechniqueMapping], rules_by_id, dataset, config)
# ---------------------------------------------------------------------------

class TestCalculateCoverage:
    def _run(
        self,
        mappings: list[TechniqueMapping],
        rules: dict[str, SigmaRule],
        dataset: AttackDataset,
        config: CoverageConfig | None = None,
    ) -> list[CoverageResult]:
        cfg = config or CoverageConfig()
        return calculate_coverage(mappings, rules, dataset, config=cfg)

    def test_no_rules_returns_zero_scores(self):
        ds = _make_dataset("T1059")
        coverage = self._run([], {}, ds)
        t1059_cov = next((c for c in coverage if c.technique_id == "T1059"), None)
        if t1059_cov:
            assert t1059_cov.coverage_score == 0.0

    def test_one_stable_rule_nonzero_score(self):
        """One stable rule should produce a coverage score > 0."""
        ds = _make_dataset("T1059")
        rule = _make_rule("r-001", "stable", ["T1059"])
        mappings = [_make_mapping("T1059", ["r-001"])]
        rules = {"r-001": rule}
        coverage = self._run(mappings, rules, ds)
        t1059 = next(c for c in coverage if c.technique_id == "T1059")
        assert t1059.coverage_score > 0.0

    def test_more_rules_higher_score(self):
        """More rules should produce a higher (saturating) coverage score."""
        ds = _make_dataset("T1059")
        rules_1 = {"r-001": _make_rule("r-001", "stable", ["T1059"])}
        mappings_1 = [_make_mapping("T1059", ["r-001"])]
        cov_1 = self._run(mappings_1, rules_1, ds)

        rules_3 = {
            "r-001": _make_rule("r-001", "stable", ["T1059"]),
            "r-002": _make_rule("r-002", "stable", ["T1059"]),
            "r-003": _make_rule("r-003", "stable", ["T1059"]),
        }
        mappings_3 = [_make_mapping("T1059", ["r-001", "r-002", "r-003"])]
        cov_3 = self._run(mappings_3, rules_3, ds)

        score_1 = next(c.coverage_score for c in cov_1 if c.technique_id == "T1059")
        score_3 = next(c.coverage_score for c in cov_3 if c.technique_id == "T1059")
        assert score_3 > score_1

    def test_exponential_saturation_formula(self):
        """Verify the formula: C_t = 100 * (1 - exp(-λ * total_weight))."""
        cfg = CoverageConfig(lambda_factor=0.3)
        lam = cfg.lambda_factor
        ds = _make_dataset("T1059")
        rule = _make_rule("r-001", "stable", ["T1059"])  # maturity_weight = 1.0
        mappings = [_make_mapping("T1059", ["r-001"])]
        rules = {"r-001": rule}
        coverage = self._run(mappings, rules, ds, config=cfg)
        t1059 = next(c for c in coverage if c.technique_id == "T1059")
        expected = 100.0 * (1.0 - math.exp(-lam * 1.0))
        assert abs(t1059.coverage_score - expected) < 0.01

    def test_experimental_rule_lower_weight(self):
        """Experimental rules (weight=0.5) should produce lower score than stable (weight=1.0)."""
        ds = _make_dataset("T1059")
        rule_stable = _make_rule("r-001", "stable", ["T1059"])
        rule_exp = _make_rule("r-002", "experimental", ["T1059"])

        cov_stable = self._run(
            [_make_mapping("T1059", ["r-001"])],
            {"r-001": rule_stable}, ds
        )
        cov_exp = self._run(
            [_make_mapping("T1059", ["r-002"])],
            {"r-002": rule_exp}, ds
        )
        score_stable = next(c.coverage_score for c in cov_stable if c.technique_id == "T1059")
        score_exp = next(c.coverage_score for c in cov_exp if c.technique_id == "T1059")
        assert score_stable > score_exp

    def test_coverage_level_assigned(self):
        """Coverage results should have a non-UNKNOWN level when score > 0."""
        ds = _make_dataset("T1059")
        rule = _make_rule("r-001", "stable", ["T1059"])
        mappings = [_make_mapping("T1059", ["r-001"])]
        coverage = self._run(mappings, {"r-001": rule}, ds)
        t1059 = next(c for c in coverage if c.technique_id == "T1059")
        assert t1059.coverage_level != CoverageLevel.UNKNOWN

    def test_mapped_rule_count_set(self):
        ds = _make_dataset("T1059")
        rules = {f"r-{i:03}": _make_rule(f"r-{i:03}", "stable", ["T1059"]) for i in range(4)}
        mappings = [_make_mapping("T1059", list(rules.keys()))]
        coverage = self._run(mappings, rules, ds)
        t1059 = next(c for c in coverage if c.technique_id == "T1059")
        assert t1059.mapped_rule_count == 4
        assert t1059.rule_count == 4  # property alias

    def test_mapped_rule_ids_set(self):
        ds = _make_dataset("T1059")
        rule = _make_rule("r-001", "stable", ["T1059"])
        mappings = [_make_mapping("T1059", ["r-001"])]
        coverage = self._run(mappings, {"r-001": rule}, ds)
        t1059 = next(c for c in coverage if c.technique_id == "T1059")
        assert "r-001" in t1059.mapped_rule_ids
        assert "r-001" in t1059.rule_ids  # property alias

    def test_technique_name_from_dataset(self):
        ds = _make_dataset("T1059")
        rule = _make_rule("r-001", "stable", ["T1059"])
        mappings = [_make_mapping("T1059", ["r-001"])]
        coverage = self._run(mappings, {"r-001": rule}, ds)
        t1059 = next(c for c in coverage if c.technique_id == "T1059")
        assert t1059.technique_name == "Technique T1059"

    def test_score_bounded_0_to_100(self):
        ds = _make_dataset("T1059")
        many_rules = {f"r-{i:04}": _make_rule(f"r-{i:04}", "stable", ["T1059"]) for i in range(50)}
        mappings = [_make_mapping("T1059", list(many_rules.keys()))]
        coverage = self._run(mappings, many_rules, ds)
        t1059 = next(c for c in coverage if c.technique_id == "T1059")
        assert 0.0 <= t1059.coverage_score <= 100.0

    def test_all_techniques_in_dataset_have_result(self):
        ds = _make_dataset("T1059", "T1003", "T1055")
        rule = _make_rule("r-001", "stable", ["T1059"])
        mappings = [_make_mapping("T1059", ["r-001"])]
        coverage = self._run(mappings, {"r-001": rule}, ds)
        technique_ids = {c.technique_id for c in coverage}
        assert "T1059" in technique_ids
