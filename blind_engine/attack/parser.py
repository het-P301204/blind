"""ATT&CK STIX bundle parser for BLIND.

Loads a MITRE ATT&CK STIX 2.1 bundle (JSON) and produces an AttackDataset
containing indexed techniques and tactics.

Raw JSON is parsed directly for portability — no stix2 SDK dependency needed
at load time.  Deprecated/revoked objects are retained with flags set.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Optional

from blind_engine.models import (
    AttackDataset,
    AttackDataSource,  # noqa: F401 — imported per API contract; used as helper below
    AttackTactic,
    AttackTechnique,
)

# Canonical technique ID pattern: T1059 or T1059.001
_TECH_ID_RE = re.compile(r"^T\d{4}(?:\.\d{3})?$")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def load_attack_dataset(path: str) -> AttackDataset:
    """Load an ATT&CK STIX bundle JSON file and parse it into an AttackDataset.

    Handles:
    - attack-pattern STIX objects → AttackTechnique
    - x-mitre-tactic STIX objects → AttackTactic
    - deprecated and revoked objects (flags set; still included in the dataset)
    - sub-technique parent_id and subtechnique_ids hierarchy
    - version from spec_version or x_mitre_attack_spec_version / x_mitre_version

    Also accepts a bare list of STIX objects (not wrapped in a bundle dict).

    Args:
        path: Absolute or relative path to the STIX bundle JSON file.

    Returns:
        AttackDataset with all parsed techniques and tactics indexed by ID.

    Raises:
        FileNotFoundError: if the file does not exist.
        ValueError: if the content is not a recognisable STIX format.
        json.JSONDecodeError: if the file contains malformed JSON.
    """
    raw = json.loads(Path(path).read_text(encoding="utf-8"))

    if isinstance(raw, dict) and "objects" in raw:
        objects: list[dict] = raw.get("objects", [])
        bundle = raw
    elif isinstance(raw, list):
        objects = raw
        bundle = {}
    else:
        raise ValueError(
            f"Unrecognised ATT&CK STIX format in {path!r}; "
            "expected a bundle dict or a list of STIX objects"
        )

    version = _extract_version(bundle, objects)

    # ── First pass: parse tactics and techniques ─────────────────────────────
    tactics: dict[str, AttackTactic] = {}
    techniques: dict[str, AttackTechnique] = {}

    for obj in objects:
        if not isinstance(obj, dict):
            continue
        obj_type = obj.get("type", "")

        if obj_type == "x-mitre-tactic":
            tactic = _parse_tactic(obj)
            if tactic is not None:
                tactics[tactic.id] = tactic

        elif obj_type == "attack-pattern":
            technique = _parse_technique(obj, version)
            if technique is not None:
                techniques[technique.id] = technique

    # ── Second pass: wire subtechnique_ids onto parent techniques ────────────
    for tid, tech in techniques.items():
        if tech.parent_id and tech.parent_id in techniques:
            parent = techniques[tech.parent_id]
            if tid not in parent.subtechnique_ids:
                parent.subtechnique_ids.append(tid)

    # Sort subtechnique lists for determinism
    for tech in techniques.values():
        tech.subtechnique_ids.sort()

    return AttackDataset(
        version=version,
        techniques=techniques,
        tactics=tactics,
        source_path=str(path),
    )


# ---------------------------------------------------------------------------
# Internal parsers
# ---------------------------------------------------------------------------


def _parse_technique(obj: dict, dataset_version: str) -> Optional[AttackTechnique]:
    """Convert a STIX attack-pattern object into an AttackTechnique.

    Returns None if the object lacks a valid MITRE ATT&CK external_id.
    """
    stix_id: str = obj.get("id", "")

    mitre_ref = _get_mitre_ref(obj)
    if mitre_ref is None:
        return None

    external_id: str = mitre_ref.get("external_id", "").strip()
    if not _TECH_ID_RE.match(external_id):
        return None

    technique_id = external_id  # already matches T#### or T####.###

    name: str = obj.get("name", "").strip()
    description: Optional[str] = _opt_str(obj.get("description"))
    external_url: Optional[str] = _opt_str(mitre_ref.get("url"))
    detection_guidance: Optional[str] = _opt_str(obj.get("x_mitre_detection"))

    # Tactic short names from kill_chain_phases (e.g. "execution")
    tactics: list[str] = []
    for phase in obj.get("kill_chain_phases") or []:
        if isinstance(phase, dict) and phase.get("kill_chain_name") == "mitre-attack":
            slug = _opt_str(phase.get("phase_name"))
            if slug and slug not in tactics:
                tactics.append(slug)

    # Platforms
    platforms: list[str] = [
        str(p) for p in (obj.get("x_mitre_platforms") or []) if p
    ]

    # Data sources — parse into AttackDataSource objects
    # STIX strings typically use "DataSource: Component" format
    data_sources: list[AttackDataSource] = []
    for ds_raw in obj.get("x_mitre_data_sources") or []:
        if isinstance(ds_raw, str) and ds_raw.strip():
            ds_str = ds_raw.strip()
            if ": " in ds_str:
                ds_name, ds_component = ds_str.split(": ", 1)
                data_sources.append(AttackDataSource(name=ds_name.strip(), component=ds_component.strip()))
            else:
                data_sources.append(AttackDataSource(name=ds_str))
        elif isinstance(ds_raw, dict):
            # Handle object-form data sources gracefully
            name_part = str(ds_raw.get("name", "")).strip()
            component_part = _opt_str(ds_raw.get("component"))
            if name_part:
                data_sources.append(AttackDataSource(name=name_part, component=component_part))

    # External reference URLs (all, not just the MITRE one)
    external_references: list[str] = [
        ref["url"]
        for ref in (obj.get("external_references") or [])
        if isinstance(ref, dict) and ref.get("url")
    ]

    is_subtechnique: bool = bool(obj.get("x_mitre_is_subtechnique", False))
    # Also infer from ID: T1059.001 is a sub-technique
    if "." in technique_id:
        is_subtechnique = True

    parent_id: Optional[str] = None
    if is_subtechnique and "." in technique_id:
        # T1059.001 → T1059  (first 5 chars: T + 4 digits)
        parent_id = technique_id[:5]

    is_deprecated: bool = bool(obj.get("x_mitre_deprecated", False))
    is_revoked: bool = bool(obj.get("revoked", False))

    return AttackTechnique(
        id=technique_id,
        name=name,
        description=description,
        tactics=tactics,
        platforms=platforms,
        data_sources=data_sources,
        is_subtechnique=is_subtechnique,
        parent_id=parent_id,
        subtechnique_ids=[],            # populated in second pass
        is_deprecated=is_deprecated,
        is_revoked=is_revoked,
        external_references=external_references,
        dataset_version=dataset_version,
        detection_guidance=detection_guidance,
        external_url=external_url,
        stix_id=stix_id,
    )


def _parse_tactic(obj: dict) -> Optional[AttackTactic]:
    """Convert a STIX x-mitre-tactic object into an AttackTactic.

    Returns None if the object lacks a valid MITRE external_id.
    """
    mitre_ref = _get_mitre_ref(obj)
    if mitre_ref is None:
        return None

    tactic_id: str = mitre_ref.get("external_id", "").strip()
    if not tactic_id:
        return None

    name: str = obj.get("name", "").strip()
    # x_mitre_shortname is the canonical short name (e.g. "execution")
    short_name: str = (
        obj.get("x_mitre_shortname")
        or name.lower().replace(" ", "-")
    ).strip()
    description: Optional[str] = _opt_str(obj.get("description"))

    return AttackTactic(
        id=tactic_id,
        name=name,
        short_name=short_name,
        description=description,
        order_index=0,
    )


# ---------------------------------------------------------------------------
# Version extraction
# ---------------------------------------------------------------------------


def _extract_version(bundle: dict, objects: list[dict]) -> str:
    """Determine the ATT&CK dataset version.

    Priority:
    1. x_mitre_attack_spec_version / x_mitre_version on x-mitre-collection or x-mitre-matrix
       (these carry the ATT&CK version, e.g. "14.1")
    2. Any other object's x_mitre_attack_spec_version / x_mitre_version
    3. bundle-level 'spec_version' (STIX format version, e.g. "2.1" — least preferred)
    4. "unknown"
    """
    priority_types = ("x-mitre-collection", "x-mitre-matrix")
    all_objects = sorted(
        objects,
        key=lambda o: (0 if o.get("type") in priority_types else 1),
    )
    for obj in all_objects:
        if not isinstance(obj, dict):
            continue
        for key in ("x_mitre_attack_spec_version", "x_mitre_version"):
            v = _opt_str(obj.get(key))
            if v and re.match(r"\d+", v):
                return v

    # Fall back to bundle-level spec_version (STIX format version)
    spec_version = _opt_str(bundle.get("spec_version"))
    if spec_version:
        return spec_version

    return "unknown"


# ---------------------------------------------------------------------------
# Tiny utilities
# ---------------------------------------------------------------------------


def _get_mitre_ref(obj: dict) -> Optional[dict]:
    """Return the MITRE ATT&CK external_reference from a STIX object, or None."""
    for ref in obj.get("external_references") or []:
        if isinstance(ref, dict) and ref.get("source_name") == "mitre-attack":
            return ref
    return None


def _opt_str(value: object) -> Optional[str]:
    """Return stripped string or None."""
    if value is None:
        return None
    s = str(value).strip()
    return s if s else None
