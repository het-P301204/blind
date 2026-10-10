"""Unit tests for BLIND Pydantic models (serialisation, validation, aliases)."""
from __future__ import annotations

import pytest
from datetime import datetime

from blind_engine.models import (
    AttackDataset,
    AttackDataSource,
    AttackTactic,
    AttackTechnique,
    CoverageConfig,
    CoverageLevel,
    CoverageResult,
    DeploymentRecord,
    DeploymentStatus,
    GapAssessment,
    IngestionSummary,
    JobStatus,
    IngestionJob,
    ParseStatus,
    PriorityConfig,
    PriorityFactor,
    RuleStatus,
    SigmaLogSource,
    SigmaRule,
    SnapshotDiff,
    TechniqueMapping,
    TelemetrySource,
    TelemetryStatus,
    ValidationRecord,
    ValidationStatus,
)


# ---------------------------------------------------------------------------
# SigmaLogSource
# ---------------------------------------------------------------------------

class TestSigmaLogSource:
    def test_all_fields(self):
        ls = SigmaLogSource(category="process_creation", product="windows", service="security")
        assert ls.category == "process_creation"
        assert ls.product == "windows"
        assert ls.service == "security"

    def test_all_optional(self):
        ls = SigmaLogSource()
        assert ls.category is None
        assert ls.product is None
        assert ls.service is None

    def test_definition_field(self):
        ls = SigmaLogSource(definition="Custom telemetry source")
        assert ls.definition == "Custom telemetry source"

    def test_log_source_alias(self):
        from blind_engine.models import LogSource
        ls = LogSource(category="network")
        assert isinstance(ls, SigmaLogSource)


# ---------------------------------------------------------------------------
# SigmaRule
# ---------------------------------------------------------------------------

class TestSigmaRule:
    def test_minimal_construction(self):
        rule = SigmaRule(id="test-rule-001")
        assert rule.id == "test-rule-001"
        assert rule.title is None
        assert rule.attack_technique_ids == []
        assert rule.attack_tactic_tags == []
        assert rule.is_demo is False

    def test_canonical_fields(self):
        rule = SigmaRule(
            id="r-001",
            title="Test",
            attack_technique_ids=["T1059"],
            attack_tactic_tags=["execution"],
            detection_condition="selection",
            status="stable",
        )
        assert rule.attack_technique_ids == ["T1059"]
        assert rule.attack_tactic_tags == ["execution"]
        assert rule.detection_condition == "selection"

    def test_alias_technique_ids(self):
        """Parser passes ``technique_ids``, model should accept and remap it."""
        rule = SigmaRule(
            id="r-002",
            technique_ids=["T1059.001", "T1059"],
            tactic_tags=["execution"],
        )
        assert rule.attack_technique_ids == ["T1059.001", "T1059"]
        assert rule.attack_tactic_tags == ["execution"]

    def test_alias_detection(self):
        """Parser passes ``detection``; model should remap to ``detection_condition``."""
        rule = SigmaRule(id="r-003", detection="selection: {Image|endswith: cmd.exe}")
        assert rule.detection_condition == "selection: {Image|endswith: cmd.exe}"

    def test_source_path_syncs_to_file_path(self):
        rule = SigmaRule(id="r-004", source_path="/rules/test.yml")
        assert rule.file_path == "/rules/test.yml"

    def test_explicit_file_path_wins(self):
        rule = SigmaRule(id="r-005", file_path="/canonical/path.yml", source_path="/other.yml")
        assert rule.file_path == "/canonical/path.yml"

    def test_maturity_weight_stable(self):
        rule = SigmaRule(id="r-006", status="stable")
        assert rule.maturity_weight == 1.0

    def test_maturity_weight_test(self):
        rule = SigmaRule(id="r-007", status="test")
        assert rule.maturity_weight == 0.75

    def test_maturity_weight_experimental(self):
        rule = SigmaRule(id="r-008", status="experimental")
        assert rule.maturity_weight == 0.50

    def test_maturity_weight_unknown(self):
        rule = SigmaRule(id="r-009", status="unknown")
        assert rule.maturity_weight == 0.25

    def test_maturity_weight_unsupported(self):
        rule = SigmaRule(id="r-010", status="unsupported")
        assert rule.maturity_weight == 0.25

    def test_parse_errors_field(self):
        rule = SigmaRule(id="r-011", parse_errors=["field 'detection' missing"])
        assert rule.parse_errors == ["field 'detection' missing"]

    def test_parse_errors_default_empty(self):
        rule = SigmaRule(id="r-012")
        assert rule.parse_errors == []

    def test_created_at_field(self):
        rule = SigmaRule(id="r-013", created_at="2024-01-15")
        assert rule.created_at == "2024-01-15"

    def test_corpus_id_and_is_demo(self):
        rule = SigmaRule(id="r-014", corpus_id="corp-001", is_demo=True)
        assert rule.corpus_id == "corp-001"
        assert rule.is_demo is True

    def test_logsource_embedded(self):
        rule = SigmaRule(
            id="r-015",
            logsource=SigmaLogSource(category="process_creation", product="windows"),
        )
        assert rule.logsource is not None
        assert rule.logsource.category == "process_creation"

    def test_serialisation_roundtrip(self):
        rule = SigmaRule(
            id="r-016",
            title="Test rule",
            attack_technique_ids=["T1059"],
            status="stable",
        )
        data = rule.model_dump(mode="json")
        restored = SigmaRule.model_validate(data)
        assert restored.id == rule.id
        assert restored.attack_technique_ids == rule.attack_technique_ids


# ---------------------------------------------------------------------------
# AttackTechnique
# ---------------------------------------------------------------------------

class TestAttackTechnique:
    def test_canonical_construction(self):
        tech = AttackTechnique(id="T1059", name="Command Scripting Interpreter", tactics=["execution"])
        assert tech.id == "T1059"
        assert tech.tactics == ["execution"]

    def test_technique_id_property(self):
        tech = AttackTechnique(id="T1059.001", name="PowerShell", tactics=["execution"])
        assert tech.technique_id == "T1059.001"

    def test_tactic_ids_property(self):
        tech = AttackTechnique(id="T1059", name="Test", tactics=["execution", "defense-evasion"])
        assert tech.tactic_ids == ["execution", "defense-evasion"]

    def test_alias_technique_id_kwarg(self):
        """Attack parser creates with technique_id= kwarg."""
        tech = AttackTechnique(technique_id="T1003", name="Credential Dumping", tactics=["credential-access"])
        assert tech.id == "T1003"

    def test_alias_tactic_short_names(self):
        """Attack parser creates with tactic_short_names= kwarg."""
        tech = AttackTechnique(id="T1003", name="Credential Dumping", tactic_short_names=["credential-access"])
        assert tech.tactics == ["credential-access"]

    def test_alias_detection(self):
        """Attack parser passes detection= kwarg."""
        tech = AttackTechnique(id="T1003", name="X", tactics=[], detection="Monitor for LSASS access")
        assert tech.detection_guidance == "Monitor for LSASS access"

    def test_data_sources(self):
        tech = AttackTechnique(
            id="T1059",
            name="X",
            tactics=[],
            data_sources=[AttackDataSource(name="Process", component="Process Creation")],
        )
        assert tech.data_sources[0].name == "Process"
        assert tech.data_sources[0].component == "Process Creation"

    def test_subtechnique_flags(self):
        tech = AttackTechnique(id="T1059.001", name="PowerShell", tactics=[], is_subtechnique=True, parent_id="T1059")
        assert tech.is_subtechnique is True
        assert tech.parent_id == "T1059"

    def test_serialisation_roundtrip(self):
        tech = AttackTechnique(id="T1059", name="Scripting", tactics=["execution"])
        data = tech.model_dump(mode="json")
        restored = AttackTechnique.model_validate(data)
        assert restored.id == tech.id


# ---------------------------------------------------------------------------
# AttackTactic
# ---------------------------------------------------------------------------

class TestAttackTactic:
    def test_canonical_construction(self):
        tactic = AttackTactic(id="TA0002", name="Execution", short_name="execution")
        assert tactic.id == "TA0002"
        assert tactic.tactic_id == "TA0002"

    def test_alias_tactic_id_kwarg(self):
        """Attack parser creates with tactic_id= kwarg."""
        tactic = AttackTactic(tactic_id="TA0001", name="Initial Access", short_name="initial-access")
        assert tactic.id == "TA0001"

    def test_technique_ids_field(self):
        tactic = AttackTactic(id="TA0002", name="Execution", short_name="execution", technique_ids=["T1059"])
        assert "T1059" in tactic.technique_ids

    def test_short_name_default_empty(self):
        tactic = AttackTactic(id="TA0002", name="Execution")
        assert tactic.short_name == ""


# ---------------------------------------------------------------------------
# AttackDataset
# ---------------------------------------------------------------------------

class TestAttackDataset:
    def test_default_construction(self):
        ds = AttackDataset()
        assert ds.techniques == {}
        assert ds.tactics == {}
        assert ds.tactics_by_short_name == {}

    def test_get_technique(self):
        tech = AttackTechnique(id="T1059", name="Scripting", tactics=[])
        ds = AttackDataset(techniques={"T1059": tech})
        assert ds.get_technique("T1059") is tech
        assert ds.get_technique("T9999") is None

    def test_list_techniques(self):
        t1 = AttackTechnique(id="T1059", name="A", tactics=[])
        t2 = AttackTechnique(id="T1003", name="B", tactics=[])
        ds = AttackDataset(techniques={"T1059": t1, "T1003": t2})
        assert len(ds.list_techniques()) == 2


# ---------------------------------------------------------------------------
# TechniqueMapping
# ---------------------------------------------------------------------------

class TestTechniqueMapping:
    def test_canonical_warnings_field(self):
        m = TechniqueMapping(technique_id="T1059", rule_ids=["r1"], warnings=["unknown technique"])
        assert m.warnings == ["unknown technique"]
        assert m.mapping_warnings == ["unknown technique"]

    def test_mapping_warnings_alias_kwarg(self):
        """Old callers pass mapping_warnings= kwarg; should be coerced to warnings."""
        m = TechniqueMapping(technique_id="T1059", mapping_warnings=["deprecated"])
        assert m.warnings == ["deprecated"]
        assert m.mapping_warnings == ["deprecated"]

    def test_empty_warnings(self):
        m = TechniqueMapping(technique_id="T1059")
        assert m.warnings == []
        assert m.mapping_warnings == []

    def test_is_unknown_flag(self):
        m = TechniqueMapping(technique_id="T9999", is_unknown=True, warnings=["not in dataset"])
        assert m.is_unknown is True


# ---------------------------------------------------------------------------
# CoverageConfig
# ---------------------------------------------------------------------------

class TestCoverageConfig:
    def test_defaults(self):
        cfg = CoverageConfig()
        assert cfg.lambda_factor == 0.3
        assert cfg.lambda_ == 0.3
        assert cfg.thresholds["limited"] == 25.0
        assert cfg.thresholds["partial"] == 60.0

    def test_maturity_weights_defaults(self):
        cfg = CoverageConfig()
        assert cfg.maturity_weights["stable"] == 1.0
        assert cfg.maturity_weights["test"] == 0.75
        assert cfg.maturity_weights["experimental"] == 0.50
        assert cfg.maturity_weights["unsupported"] == 0.25
        assert cfg.maturity_weights["unknown"] == 0.25

    def test_custom_lambda(self):
        cfg = CoverageConfig(lambda_factor=0.5)
        assert cfg.lambda_factor == 0.5
        assert cfg.lambda_ == 0.5


# ---------------------------------------------------------------------------
# CoverageResult
# ---------------------------------------------------------------------------

class TestCoverageResult:
    def test_default_coverage_level(self):
        r = CoverageResult(technique_id="T1059", technique_name="Scripting")
        assert r.coverage_level == CoverageLevel.UNKNOWN

    def test_canonical_fields(self):
        r = CoverageResult(
            technique_id="T1059",
            technique_name="Scripting",
            mapped_rule_count=3,
            mapped_rule_ids=["r1", "r2", "r3"],
            coverage_score=55.0,
            coverage_level=CoverageLevel.PARTIAL,
        )
        assert r.mapped_rule_count == 3
        assert r.rule_count == 3
        assert r.mapped_rule_ids == ["r1", "r2", "r3"]
        assert r.rule_ids == ["r1", "r2", "r3"]

    def test_alias_rule_count(self):
        """Scorer creates with rule_count= kwarg; should map to mapped_rule_count."""
        r = CoverageResult(
            technique_id="T1059",
            technique_name="Scripting",
            rule_count=5,
            rule_ids=["a", "b", "c", "d", "e"],
        )
        assert r.mapped_rule_count == 5
        assert len(r.mapped_rule_ids) == 5

    def test_tactic_sync(self):
        """tactics and tactic_ids should be kept in sync."""
        r = CoverageResult(
            technique_id="T1059",
            technique_name="Scripting",
            tactics=["execution"],
        )
        assert r.tactic_ids == ["execution"]

    def test_tactic_ids_sync(self):
        r = CoverageResult(
            technique_id="T1059",
            technique_name="Scripting",
            tactic_ids=["execution", "defense-evasion"],
        )
        assert r.tactics == ["execution", "defense-evasion"]

    def test_serialisation_roundtrip(self):
        r = CoverageResult(
            technique_id="T1059",
            technique_name="Scripting",
            mapped_rule_count=2,
            coverage_score=40.0,
            coverage_level=CoverageLevel.PARTIAL,
        )
        data = r.model_dump(mode="json")
        restored = CoverageResult.model_validate(data)
        assert restored.technique_id == r.technique_id
        assert restored.mapped_rule_count == 2


# ---------------------------------------------------------------------------
# GapAssessment
# ---------------------------------------------------------------------------

class TestGapAssessment:
    def test_defaults(self):
        g = GapAssessment(technique_id="T1059", technique_name="Scripting")
        assert g.priority_score == 0.0
        assert g.coverage_level == CoverageLevel.UNKNOWN

    def test_tactic_sync(self):
        g = GapAssessment(
            technique_id="T1059",
            technique_name="Scripting",
            tactics=["execution"],
        )
        assert g.tactic_ids == ["execution"]

    def test_priority_factors(self):
        factor = PriorityFactor(name="coverage_gap", value=1.0, weight=1.0, contribution=1.0)
        g = GapAssessment(
            technique_id="T1059",
            technique_name="Scripting",
            priority_factors=[factor],
        )
        assert len(g.priority_factors) == 1
        assert g.priority_factors[0].name == "coverage_gap"


# ---------------------------------------------------------------------------
# IngestionSummary
# ---------------------------------------------------------------------------

class TestIngestionSummary:
    def test_canonical_construction(self):
        s = IngestionSummary(
            corpus_id="corp-001",
            files_discovered=100,
            successfully_parsed=90,
            invalid_files=5,
            duplicates=5,
        )
        assert s.files_discovered == 100
        assert s.successfully_parsed == 90

    def test_alias_total_files(self):
        """Sigma parser uses total_files=; should remap to files_discovered."""
        s = IngestionSummary(corpus_id="corp-001", total_files=50, parsed=45, invalid=3, duplicate=2)
        assert s.files_discovered == 50
        assert s.successfully_parsed == 45
        assert s.invalid_files == 3
        assert s.duplicates == 2

    def test_technique_ids_found(self):
        s = IngestionSummary(corpus_id="c", technique_ids_found=["T1059", "T1003"])
        assert "T1059" in s.technique_ids_found

    def test_computed_properties(self):
        s = IngestionSummary(
            corpus_id="c",
            successfully_parsed=80,
            parsed_with_warnings=10,
            invalid_files=10,
        )
        assert s.valid_rules == 90
        assert s.rules_with_warnings == 10
        assert s.invalid_rules == 10


# ---------------------------------------------------------------------------
# TelemetrySource
# ---------------------------------------------------------------------------

class TestTelemetrySource:
    def test_canonical_id(self):
        ts = TelemetrySource(id="ts-001", name="Sysmon", is_demo=True)
        assert ts.id == "ts-001"
        assert ts.is_demo is True

    def test_coverage_scope(self):
        ts = TelemetrySource(id="ts-002", name="EDR", coverage_scope="endpoint")
        assert ts.coverage_scope == "endpoint"


# ---------------------------------------------------------------------------
# DeploymentRecord
# ---------------------------------------------------------------------------

class TestDeploymentRecord:
    def test_construction(self):
        dr = DeploymentRecord(id="dep-001", rule_id="r-001", siem_target="Splunk")
        assert dr.id == "dep-001"
        assert dr.deployment_status == DeploymentStatus.UNKNOWN


# ---------------------------------------------------------------------------
# ValidationRecord
# ---------------------------------------------------------------------------

class TestValidationRecord:
    def test_construction(self):
        vr = ValidationRecord(
            id="val-001",
            technique_id="T1059",
            objective="Validate PowerShell detection",
            required_telemetry=["Sysmon"],
            is_synthetic=True,
        )
        assert vr.id == "val-001"
        assert vr.status == ValidationStatus.NOT_TESTED
        assert vr.is_synthetic is True

    def test_validation_status_property(self):
        vr = ValidationRecord(
            id="val-002",
            technique_id="T1059",
            status=ValidationStatus.PASSED,
        )
        assert vr.validation_status == ValidationStatus.PASSED


# ---------------------------------------------------------------------------
# IngestionJob
# ---------------------------------------------------------------------------

class TestIngestionJob:
    def test_default_status(self):
        job = IngestionJob(job_id="job-001")
        assert job.status == JobStatus.QUEUED

    def test_status_enum(self):
        job = IngestionJob(job_id="job-002", status=JobStatus.RUNNING)
        assert job.status == JobStatus.RUNNING


# ---------------------------------------------------------------------------
# PriorityConfig
# ---------------------------------------------------------------------------

class TestPriorityConfig:
    def test_default_weights(self):
        cfg = PriorityConfig()
        w = cfg.weights
        assert w["coverage_gap"] == 1.0
        assert w["telemetry_readiness"] == 0.8
        assert w["validation_confidence"] == 0.7
        assert w["deployment_confidence"] == 0.6
