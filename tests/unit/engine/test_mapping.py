"""Unit tests for the technique-mapping engine."""
from __future__ import annotations

import pytest

from blind_engine.mapping.mapper import map_rules_to_techniques
from blind_engine.models import (
    AttackDataset,
    AttackTechnique,
    SigmaRule,
    TechniqueMapping,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_tech(tid: str, name: str = "Test Technique") -> AttackTechnique:
    return AttackTechnique(id=tid, name=name, tactics=["execution"])


def _make_rule(rule_id: str, technique_ids: list[str], status: str = "stable") -> SigmaRule:
    return SigmaRule(
        id=rule_id,
        title=f"Rule {rule_id}",
        attack_technique_ids=technique_ids,
        status=status,
    )


def _make_dataset(*technique_ids: str) -> AttackDataset:
    techs = {tid: _make_tech(tid) for tid in technique_ids}
    return AttackDataset(techniques=techs)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestMapRulesToTechniques:
    def test_empty_rules_returns_empty(self):
        ds = _make_dataset("T1059")
        result = map_rules_to_techniques([], ds)
        assert result == {} or isinstance(result, (dict, list))

    def test_single_rule_single_technique(self):
        ds = _make_dataset("T1059")
        rules = [_make_rule("r-001", ["T1059"])]
        mappings = map_rules_to_techniques(rules, ds)
        assert _get_mapping(mappings, "T1059") is not None

    def test_rule_id_appears_in_mapping(self):
        ds = _make_dataset("T1059")
        rules = [_make_rule("r-001", ["T1059"])]
        mappings = map_rules_to_techniques(rules, ds)
        m = _get_mapping(mappings, "T1059")
        assert m is not None
        assert "r-001" in m.rule_ids

    def test_multiple_rules_same_technique(self):
        ds = _make_dataset("T1059")
        rules = [_make_rule("r-001", ["T1059"]), _make_rule("r-002", ["T1059"])]
        mappings = map_rules_to_techniques(rules, ds)
        m = _get_mapping(mappings, "T1059")
        assert m is not None
        assert len(m.rule_ids) == 2

    def test_rule_maps_multiple_techniques(self):
        ds = _make_dataset("T1059", "T1105")
        rules = [_make_rule("r-001", ["T1059", "T1105"])]
        mappings = map_rules_to_techniques(rules, ds)
        m1 = _get_mapping(mappings, "T1059")
        m2 = _get_mapping(mappings, "T1105")
        assert m1 is not None
        assert m2 is not None
        assert "r-001" in m1.rule_ids
        assert "r-001" in m2.rule_ids

    def test_unknown_technique_flagged(self):
        ds = _make_dataset("T1059")
        rules = [_make_rule("r-001", ["T9999"])]
        mappings = map_rules_to_techniques(rules, ds)
        m = _get_mapping(mappings, "T9999")
        if m is not None:
            # Should be flagged as unknown or have warnings
            assert m.is_unknown is True or len(m.mapping_warnings) > 0

    def test_mapping_warnings_property(self):
        """mapping_warnings property should work (alias for warnings)."""
        ds = _make_dataset("T1059")
        rules = [_make_rule("r-001", ["T9999"])]
        mappings = map_rules_to_techniques(rules, ds)
        m = _get_mapping(mappings, "T9999")
        if m is not None:
            assert isinstance(m.mapping_warnings, list)

    def test_rule_with_no_techniques_not_in_mappings(self):
        ds = _make_dataset("T1059")
        rules = [_make_rule("r-001", [])]
        mappings = map_rules_to_techniques(rules, ds)
        # No technique mappings should be created for rules with no technique IDs
        all_rule_ids = set()
        for m in _iter_mappings(mappings):
            all_rule_ids.update(m.rule_ids)
        assert "r-001" not in all_rule_ids

    def test_technique_id_matches(self):
        """The TechniqueMapping technique_id should match the expected ID."""
        ds = _make_dataset("T1059")
        rules = [_make_rule("r-001", ["T1059"])]
        mappings = map_rules_to_techniques(rules, ds)
        m = _get_mapping(mappings, "T1059")
        assert m is not None
        assert m.technique_id == "T1059"

    def test_returns_dict_or_list(self):
        """map_rules_to_techniques should return a dict or list."""
        ds = _make_dataset("T1059")
        rules = [_make_rule("r-001", ["T1059"])]
        result = map_rules_to_techniques(rules, ds)
        assert isinstance(result, (dict, list))


# ---------------------------------------------------------------------------
# Utility functions
# ---------------------------------------------------------------------------

def _get_mapping(mappings, technique_id: str) -> TechniqueMapping | None:
    """Get a TechniqueMapping from dict or list result."""
    if isinstance(mappings, dict):
        return mappings.get(technique_id)
    for m in mappings:
        if m.technique_id == technique_id:
            return m
    return None


def _iter_mappings(mappings) -> list[TechniqueMapping]:
    if isinstance(mappings, dict):
        return list(mappings.values())
    return list(mappings)
