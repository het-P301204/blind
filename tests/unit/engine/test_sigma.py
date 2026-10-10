"""Unit tests for the Sigma YAML rule parser."""
from __future__ import annotations

from pathlib import Path

import pytest

from blind_engine.models import ParseStatus, SigmaRule
from blind_engine.sigma.parser import parse_rule_file, parse_directory

# Fixture directory relative to this test file
FIXTURE_DIR = Path(__file__).parent.parent.parent / "fixtures" / "sigma"


class TestParseRuleFile:
    """Tests for parse_rule_file (parses a single YAML file into SigmaRule)."""

    def test_valid_rule_parsed(self):
        rule = parse_rule_file(str(FIXTURE_DIR / "valid-rule.yml"), corpus_id="test")
        assert rule is not None
        assert rule.parse_status in (ParseStatus.PARSED, ParseStatus.PARSED_WITH_WARNINGS)
        assert rule.id == "a3d2bea5-4a3c-4e8b-82b1-c9f1e2d3a4b5"
        assert rule.title == "Mimikatz LSASS Memory Access"

    def test_valid_rule_has_technique_ids(self):
        rule = parse_rule_file(str(FIXTURE_DIR / "valid-rule.yml"), corpus_id="test")
        assert "T1003.001" in rule.attack_technique_ids or "T1003" in rule.attack_technique_ids

    def test_valid_rule_has_tactic_tags(self):
        rule = parse_rule_file(str(FIXTURE_DIR / "valid-rule.yml"), corpus_id="test")
        assert len(rule.attack_tactic_tags) > 0 or len(rule.tags) > 0

    def test_valid_rule_has_logsource(self):
        rule = parse_rule_file(str(FIXTURE_DIR / "valid-rule.yml"), corpus_id="test")
        assert rule.logsource is not None
        assert rule.logsource.category == "process_access"

    def test_valid_rule_has_detection_condition(self):
        rule = parse_rule_file(str(FIXTURE_DIR / "valid-rule.yml"), corpus_id="test")
        assert rule.detection_condition is not None
        assert len(rule.detection_condition) > 0

    def test_valid_rule_has_status(self):
        rule = parse_rule_file(str(FIXTURE_DIR / "valid-rule.yml"), corpus_id="test")
        assert rule.status is not None
        assert str(rule.status).lower() in ("stable", "test", "experimental")

    def test_valid_rule_corpus_id_set(self):
        rule = parse_rule_file(str(FIXTURE_DIR / "valid-rule.yml"), corpus_id="my-corpus")
        assert rule.corpus_id == "my-corpus"

    def test_invalid_yaml_returns_invalid_status(self):
        rule = parse_rule_file(str(FIXTURE_DIR / "invalid-yaml.yml"), corpus_id="test")
        assert rule.parse_status == ParseStatus.INVALID

    def test_missing_tags_rule_has_no_technique_ids(self):
        rule = parse_rule_file(str(FIXTURE_DIR / "missing-tags.yml"), corpus_id="test")
        assert rule.attack_technique_ids == []

    def test_unknown_technique_rule_parses(self):
        """Rule with unrecognised T9999 should still parse."""
        rule = parse_rule_file(str(FIXTURE_DIR / "unknown-technique.yml"), corpus_id="test")
        assert rule is not None
        assert rule.parse_status != ParseStatus.INVALID

    def test_nonexistent_file_returns_invalid(self):
        rule = parse_rule_file("/nonexistent/path/rule.yml", corpus_id="test")
        assert rule.parse_status == ParseStatus.INVALID

    def test_file_path_set_on_rule(self):
        rule = parse_rule_file(str(FIXTURE_DIR / "valid-rule.yml"), corpus_id="test")
        assert rule.file_path is not None
        assert len(rule.file_path) > 0


class TestParseDirectory:
    """Tests for parse_directory (bulk parse returning (rules, summary))."""

    def test_parse_fixture_directory(self):
        rules, summary = parse_directory(str(FIXTURE_DIR), corpus_id="test")
        assert summary.files_discovered > 0
        assert summary.successfully_parsed + summary.parsed_with_warnings > 0

    def test_summary_corpus_id(self):
        rules, summary = parse_directory(str(FIXTURE_DIR), corpus_id="dir-corpus")
        assert summary.corpus_id == "dir-corpus"

    def test_invalid_count_nonzero(self):
        rules, summary = parse_directory(str(FIXTURE_DIR), corpus_id="test")
        assert summary.invalid_files >= 1

    def test_rules_list_not_empty(self):
        rules, summary = parse_directory(str(FIXTURE_DIR), corpus_id="test")
        assert len(rules) > 0

    def test_all_returned_rules_have_ids(self):
        rules, summary = parse_directory(str(FIXTURE_DIR), corpus_id="test")
        for rule in rules:
            assert rule.id

    def test_nonexistent_directory_returns_empty(self):
        """Non-existent directory: parser returns empty list + summary with error."""
        rules, summary = parse_directory("/totally/nonexistent/directory", corpus_id="test")
        assert rules == []
        assert len(summary.errors) > 0

    def test_duplicate_detection(self):
        """Two rules with same ID should be flagged (duplicates >= 1 or warnings)."""
        rules, summary = parse_directory(str(FIXTURE_DIR), corpus_id="test")
        assert summary.duplicates >= 1 or summary.parsed_with_warnings >= 1

    def test_technique_ids_found_is_list(self):
        rules, summary = parse_directory(str(FIXTURE_DIR), corpus_id="test")
        assert isinstance(summary.technique_ids_found, list)

    def test_returns_tuple(self):
        result = parse_directory(str(FIXTURE_DIR), corpus_id="test")
        assert len(result) == 2
        rules, summary = result
        assert isinstance(rules, list)
