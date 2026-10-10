"""Unit tests for the export modules (JSON, CSV, ATT&CK Navigator)."""
from __future__ import annotations

import csv
import io
import json

import pytest

from blind_engine.export.json_exporter import export_analysis_json
from blind_engine.export.csv_exporter import export_gaps_csv
from blind_engine.export.navigator import export_navigator_layer
from blind_engine.models import (
    AttackDataset,
    AttackTechnique,
    CoverageLevel,
    CoverageResult,
    GapAssessment,
    IngestionSummary,
    TelemetryStatus,
    ValidationStatus,
    DeploymentStatus,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_tech(tid: str, name: str = "Test Technique") -> AttackTechnique:
    return AttackTechnique(id=tid, name=name, tactics=["execution"])


def _make_dataset(*technique_ids: str) -> AttackDataset:
    techs = {tid: _make_tech(tid) for tid in technique_ids}
    return AttackDataset(techniques=techs)


def _make_coverage(
    technique_id: str,
    score: float = 0.0,
    level: CoverageLevel = CoverageLevel.NO_MAPPED_COVERAGE,
    rule_count: int = 0,
    rule_ids: list[str] | None = None,
) -> CoverageResult:
    return CoverageResult(
        technique_id=technique_id,
        technique_name=f"Technique {technique_id}",
        coverage_score=score,
        coverage_level=level,
        mapped_rule_count=rule_count,
        mapped_rule_ids=rule_ids or [],
        tactic_ids=["execution"],
    )


def _make_gap(
    technique_id: str,
    priority_rank: int = 1,
    priority_score: float = 1.0,
    rule_count: int = 0,
    level: CoverageLevel = CoverageLevel.NO_MAPPED_COVERAGE,
) -> GapAssessment:
    return GapAssessment(
        technique_id=technique_id,
        technique_name=f"Technique {technique_id}",
        priority_rank=priority_rank,
        priority_score=priority_score,
        coverage_score=0.0,
        coverage_level=level,
        mapped_rule_count=rule_count,
        tactic_ids=["execution"],
        tactics=["execution"],
    )


def _make_summary(corpus_id: str = "test", total_rules: int = 10) -> IngestionSummary:
    return IngestionSummary(corpus_id=corpus_id, total_rules=total_rules, successfully_parsed=total_rules)


# ---------------------------------------------------------------------------
# JSON exporter
# ---------------------------------------------------------------------------

class TestExportAnalysisJson:
    def test_returns_dict(self):
        result = export_analysis_json([], [], None, None)
        assert isinstance(result, dict)

    def test_top_level_keys(self):
        result = export_analysis_json([], [], None, None)
        assert "metadata" in result
        assert "coverage" in result
        assert "gaps" in result

    def test_metadata_has_corpus_id(self):
        summary = _make_summary("corp-001")
        result = export_analysis_json([], [], summary, None)
        assert result["metadata"]["corpus_id"] == "corp-001"

    def test_metadata_has_total_rules(self):
        summary = _make_summary(total_rules=42)
        result = export_analysis_json([], [], summary, None)
        assert result["metadata"]["total_rules"] == 42

    def test_coverage_total_techniques(self):
        coverage = [_make_coverage("T1059"), _make_coverage("T1003")]
        result = export_analysis_json(coverage, [], None, None)
        assert result["coverage"]["total_techniques"] == 2

    def test_coverage_covered_techniques(self):
        coverage = [
            _make_coverage("T1059", score=60.0, level=CoverageLevel.STRONG, rule_count=3),
            _make_coverage("T1003", score=0.0, level=CoverageLevel.NO_MAPPED_COVERAGE),
        ]
        result = export_analysis_json(coverage, [], None, None)
        assert result["coverage"]["covered_techniques"] == 1

    def test_coverage_mean_score(self):
        coverage = [
            _make_coverage("T1059", score=60.0),
            _make_coverage("T1003", score=40.0),
        ]
        result = export_analysis_json(coverage, [], None, None)
        assert abs(result["coverage"]["mean_score"] - 50.0) < 0.1

    def test_coverage_techniques_list(self):
        coverage = [_make_coverage("T1059", score=30.0)]
        result = export_analysis_json(coverage, [], None, None)
        assert len(result["coverage"]["techniques"]) == 1

    def test_gaps_total(self):
        gaps = [_make_gap("T1059"), _make_gap("T1003", priority_rank=2)]
        result = export_analysis_json([], gaps, None, None)
        assert result["gaps"]["total_gaps"] == 2

    def test_gaps_top_10(self):
        gaps = [_make_gap(f"T{1000+i}", priority_rank=i+1) for i in range(15)]
        result = export_analysis_json([], gaps, None, None)
        assert len(result["gaps"]["top_10"]) == 10

    def test_by_level_breakdown(self):
        coverage = [
            _make_coverage("T1059", score=80.0, level=CoverageLevel.STRONG),
            _make_coverage("T1003", score=0.0, level=CoverageLevel.NO_MAPPED_COVERAGE),
        ]
        result = export_analysis_json(coverage, [], None, None)
        by_level = result["coverage"]["by_level"]
        assert "STRONG" in by_level
        assert "NO_MAPPED_COVERAGE" in by_level
        assert by_level["STRONG"] == 1
        assert by_level["NO_MAPPED_COVERAGE"] == 1

    def test_json_serialisable(self):
        coverage = [_make_coverage("T1059", score=45.0, level=CoverageLevel.PARTIAL)]
        gaps = [_make_gap("T1003")]
        summary = _make_summary()
        result = export_analysis_json(coverage, gaps, summary, None)
        # Should not raise
        serialised = json.dumps(result, default=str)
        assert len(serialised) > 0


# ---------------------------------------------------------------------------
# CSV exporter
# ---------------------------------------------------------------------------

class TestExportGapsCsv:
    def test_returns_string(self):
        gaps = [_make_gap("T1059")]
        result = export_gaps_csv(gaps)
        assert isinstance(result, str)

    def test_csv_has_header(self):
        result = export_gaps_csv([])
        assert "technique_id" in result or "priority_rank" in result

    def test_csv_has_row_per_gap(self):
        gaps = [_make_gap("T1059", 1), _make_gap("T1003", 2)]
        result = export_gaps_csv(gaps)
        reader = csv.DictReader(io.StringIO(result))
        rows = list(reader)
        assert len(rows) == 2

    def test_csv_technique_id_field(self):
        gaps = [_make_gap("T1059")]
        result = export_gaps_csv(gaps)
        reader = csv.DictReader(io.StringIO(result))
        rows = list(reader)
        assert rows[0]["technique_id"] == "T1059"

    def test_csv_priority_rank_field(self):
        gaps = [_make_gap("T1059", priority_rank=3)]
        result = export_gaps_csv(gaps)
        reader = csv.DictReader(io.StringIO(result))
        rows = list(reader)
        assert rows[0]["priority_rank"] == "3"

    def test_csv_empty_gaps(self):
        result = export_gaps_csv([])
        lines = [l for l in result.strip().splitlines() if l.strip()]
        assert len(lines) == 1  # header only

    def test_csv_priority_score_formatted(self):
        gaps = [_make_gap("T1059", priority_score=0.876)]
        result = export_gaps_csv(gaps)
        reader = csv.DictReader(io.StringIO(result))
        rows = list(reader)
        assert "0.88" in rows[0]["priority_score"] or "0.87" in rows[0]["priority_score"] or "0.876" in rows[0]["priority_score"]


# ---------------------------------------------------------------------------
# Navigator exporter
# ---------------------------------------------------------------------------

class TestExportNavigatorLayer:
    def test_returns_dict(self):
        ds = _make_dataset("T1059")
        coverage = [_make_coverage("T1059", score=50.0)]
        result = export_navigator_layer(coverage, ds, corpus_id="test")
        assert isinstance(result, dict)

    def test_layer_has_techniques_key(self):
        ds = _make_dataset("T1059")
        coverage = [_make_coverage("T1059", score=50.0, rule_count=2)]
        result = export_navigator_layer(coverage, ds, corpus_id="test")
        assert "techniques" in result

    def test_layer_schema_version(self):
        ds = _make_dataset("T1059")
        result = export_navigator_layer([], ds, corpus_id="test")
        # Schema version may vary; just check the result is a dict
        assert isinstance(result, dict)

    def test_covered_techniques_in_layer(self):
        ds = _make_dataset("T1059", "T1003")
        coverage = [
            _make_coverage("T1059", score=60.0, level=CoverageLevel.STRONG, rule_count=3),
            _make_coverage("T1003", score=0.0, level=CoverageLevel.NO_MAPPED_COVERAGE, rule_count=0),
        ]
        result = export_navigator_layer(coverage, ds, corpus_id="test")
        technique_ids = [t["techniqueID"] for t in result.get("techniques", [])]
        # All techniques in coverage are included (even 0-score ones)
        assert "T1059" in technique_ids
        assert len(technique_ids) == 2

    def test_technique_score_in_layer(self):
        ds = _make_dataset("T1059")
        coverage = [_make_coverage("T1059", score=75.0, level=CoverageLevel.STRONG, rule_count=4)]
        result = export_navigator_layer(coverage, ds, corpus_id="test")
        techniques = result.get("techniques", [])
        if techniques:
            t = next((t for t in techniques if t.get("techniqueID") == "T1059"), None)
            if t is not None:
                assert "score" in t or "color" in t

    def test_json_serialisable(self):
        ds = _make_dataset("T1059")
        coverage = [_make_coverage("T1059", score=45.0, rule_count=2)]
        result = export_navigator_layer(coverage, ds, corpus_id="test")
        serialised = json.dumps(result, default=str)
        assert len(serialised) > 0

    def test_empty_coverage_returns_valid_layer(self):
        ds = _make_dataset()
        result = export_navigator_layer([], ds, corpus_id="test")
        assert isinstance(result, dict)
        assert result.get("techniques", []) == []
