"""Unit tests for the ATT&CK STIX bundle parser."""
from __future__ import annotations

import json
import tempfile
from pathlib import Path

import pytest

from blind_engine.attack.parser import load_attack_dataset
from blind_engine.models import AttackDataset, AttackTechnique, AttackTactic


# ---------------------------------------------------------------------------
# Helpers to build minimal STIX bundles for testing
# ---------------------------------------------------------------------------

def _make_technique_stix(
    external_id: str,
    name: str,
    tactics: list[str] | None = None,
    is_subtechnique: bool = False,
    data_sources: list[str] | None = None,
    revoked: bool = False,
    deprecated: bool = False,
    detection: str | None = None,
) -> dict:
    """Create a minimal STIX attack-pattern object."""
    phases = [
        {"kill_chain_name": "mitre-attack", "phase_name": t}
        for t in (tactics or [])
    ]
    obj = {
        "type": "attack-pattern",
        "id": f"attack-pattern--{external_id}",
        "name": name,
        "x_mitre_is_subtechnique": is_subtechnique,
        "x_mitre_platforms": ["Windows"],
        "kill_chain_phases": phases,
        "external_references": [
            {"source_name": "mitre-attack", "external_id": external_id, "url": f"https://attack.mitre.org/techniques/{external_id}/"}
        ],
        "revoked": revoked,
        "x_mitre_deprecated": deprecated,
    }
    if data_sources:
        obj["x_mitre_data_sources"] = data_sources
    if detection:
        obj["x_mitre_detection"] = detection
    return obj


def _make_tactic_stix(external_id: str, name: str, short_name: str) -> dict:
    return {
        "type": "x-mitre-tactic",
        "id": f"x-mitre-tactic--{external_id}",
        "name": name,
        "x_mitre_shortname": short_name,
        "external_references": [
            {"source_name": "mitre-attack", "external_id": external_id}
        ],
    }


def _write_bundle(objects: list[dict], tmp_path: Path, spec_version: str = "2.1") -> str:
    bundle = {"type": "bundle", "spec_version": spec_version, "objects": objects}
    p = tmp_path / "bundle.json"
    p.write_text(json.dumps(bundle), encoding="utf-8")
    return str(p)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestLoadAttackDataset:
    def test_empty_bundle(self, tmp_path):
        path = _write_bundle([], tmp_path)
        ds = load_attack_dataset(path)
        assert isinstance(ds, AttackDataset)
        assert ds.techniques == {}
        assert ds.tactics == {}

    def test_single_technique_parsed(self, tmp_path):
        objects = [_make_technique_stix("T1059", "Command and Scripting Interpreter", tactics=["execution"])]
        path = _write_bundle(objects, tmp_path)
        ds = load_attack_dataset(path)
        assert "T1059" in ds.techniques
        tech = ds.techniques["T1059"]
        assert tech.name == "Command and Scripting Interpreter"

    def test_technique_id_field(self, tmp_path):
        objects = [_make_technique_stix("T1059", "Scripting", tactics=["execution"])]
        path = _write_bundle(objects, tmp_path)
        ds = load_attack_dataset(path)
        tech = ds.techniques["T1059"]
        assert tech.id == "T1059"
        assert tech.technique_id == "T1059"  # property

    def test_tactic_short_names(self, tmp_path):
        objects = [_make_technique_stix("T1059", "Scripting", tactics=["execution", "defense-evasion"])]
        path = _write_bundle(objects, tmp_path)
        ds = load_attack_dataset(path)
        tech = ds.techniques["T1059"]
        assert "execution" in tech.tactics
        assert "defense-evasion" in tech.tactics

    def test_tactic_ids_property(self, tmp_path):
        objects = [_make_technique_stix("T1059", "Scripting", tactics=["execution"])]
        path = _write_bundle(objects, tmp_path)
        ds = load_attack_dataset(path)
        tech = ds.techniques["T1059"]
        assert tech.tactic_ids == tech.tactics

    def test_subtechnique_parsed(self, tmp_path):
        parent = _make_technique_stix("T1059", "Scripting", tactics=["execution"])
        child = _make_technique_stix("T1059.001", "PowerShell", tactics=["execution"], is_subtechnique=True)
        path = _write_bundle([parent, child], tmp_path)
        ds = load_attack_dataset(path)
        assert "T1059.001" in ds.techniques
        child_tech = ds.techniques["T1059.001"]
        assert child_tech.is_subtechnique is True
        assert child_tech.parent_id == "T1059"

    def test_subtechnique_wired_to_parent(self, tmp_path):
        parent = _make_technique_stix("T1059", "Scripting", tactics=["execution"])
        child = _make_technique_stix("T1059.001", "PowerShell", tactics=["execution"], is_subtechnique=True)
        path = _write_bundle([parent, child], tmp_path)
        ds = load_attack_dataset(path)
        assert "T1059.001" in ds.techniques["T1059"].subtechnique_ids

    def test_tactic_parsed(self, tmp_path):
        tactic = _make_tactic_stix("TA0002", "Execution", "execution")
        path = _write_bundle([tactic], tmp_path)
        ds = load_attack_dataset(path)
        assert "TA0002" in ds.tactics
        t = ds.tactics["TA0002"]
        assert t.name == "Execution"
        assert t.short_name == "execution"

    def test_revoked_technique_included_with_flag(self, tmp_path):
        objects = [_make_technique_stix("T1059", "Scripting", revoked=True)]
        path = _write_bundle(objects, tmp_path)
        ds = load_attack_dataset(path)
        assert "T1059" in ds.techniques
        assert ds.techniques["T1059"].is_revoked is True

    def test_deprecated_technique_included_with_flag(self, tmp_path):
        objects = [_make_technique_stix("T1059", "Scripting", deprecated=True)]
        path = _write_bundle(objects, tmp_path)
        ds = load_attack_dataset(path)
        assert ds.techniques["T1059"].is_deprecated is True

    def test_data_sources_parsed(self, tmp_path):
        objects = [_make_technique_stix(
            "T1059", "Scripting",
            data_sources=["Process: Process Creation", "Command: Command Execution"],
        )]
        path = _write_bundle(objects, tmp_path)
        ds = load_attack_dataset(path)
        tech = ds.techniques["T1059"]
        assert len(tech.data_sources) == 2
        ds_names = [s.name for s in tech.data_sources]
        assert "Process" in ds_names

    def test_detection_guidance_parsed(self, tmp_path):
        objects = [_make_technique_stix("T1059", "Scripting", detection="Monitor process creation events")]
        path = _write_bundle(objects, tmp_path)
        ds = load_attack_dataset(path)
        assert ds.techniques["T1059"].detection_guidance == "Monitor process creation events"

    def test_version_from_spec_version(self, tmp_path):
        path = _write_bundle([], tmp_path, spec_version="2.1")
        ds = load_attack_dataset(path)
        assert ds.version == "2.1"

    def test_nonexistent_file_raises(self):
        with pytest.raises(FileNotFoundError):
            load_attack_dataset("/totally/nonexistent/bundle.json")

    def test_invalid_json_raises(self, tmp_path):
        p = tmp_path / "bad.json"
        p.write_text("{ this is: not json }", encoding="utf-8")
        with pytest.raises(Exception):
            load_attack_dataset(str(p))

    def test_multiple_techniques(self, tmp_path):
        objects = [
            _make_technique_stix("T1059", "Scripting", tactics=["execution"]),
            _make_technique_stix("T1003", "Credential Dumping", tactics=["credential-access"]),
            _make_technique_stix("T1055", "Process Injection", tactics=["defense-evasion"]),
        ]
        path = _write_bundle(objects, tmp_path)
        ds = load_attack_dataset(path)
        assert len(ds.techniques) == 3

    def test_get_technique_helper(self, tmp_path):
        objects = [_make_technique_stix("T1059", "Scripting", tactics=["execution"])]
        path = _write_bundle(objects, tmp_path)
        ds = load_attack_dataset(path)
        assert ds.get_technique("T1059") is not None
        assert ds.get_technique("T9999") is None

    def test_list_techniques_helper(self, tmp_path):
        objects = [
            _make_technique_stix("T1059", "Scripting", tactics=["execution"]),
            _make_technique_stix("T1003", "Credentials", tactics=["credential-access"]),
        ]
        path = _write_bundle(objects, tmp_path)
        ds = load_attack_dataset(path)
        assert len(ds.list_techniques()) == 2

    def test_bare_list_of_objects(self, tmp_path):
        """Bundle can be a bare list of objects (no wrapper dict)."""
        objects = [_make_technique_stix("T1059", "Scripting", tactics=["execution"])]
        p = tmp_path / "bare.json"
        p.write_text(json.dumps(objects), encoding="utf-8")
        ds = load_attack_dataset(str(p))
        assert "T1059" in ds.techniques
