"""Parse Sigma rule YAML files into SigmaRule models."""
from __future__ import annotations

import hashlib
import json
import re
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

import yaml

from blind_engine.models import IngestionSummary, ParseStatus, SigmaLogSource, SigmaRule

# Max file size guard: 1 MB
_MAX_FILE_BYTES = 1 * 1024 * 1024

# Matches attack.t1059 or attack.t1059.001 (case-insensitive)
_TECHNIQUE_RE = re.compile(r"^attack\.(t\d{4}(?:\.\d{3})?)$", re.IGNORECASE)

# Known ATT&CK tactic short-names
_ATTACK_TACTICS: frozenset[str] = frozenset(
    {
        "reconnaissance", "resource-development", "initial-access", "execution",
        "persistence", "privilege-escalation", "defense-evasion", "credential-access",
        "discovery", "lateral-movement", "collection", "command-and-control",
        "exfiltration", "impact",
    }
)


# ── Public API ─────────────────────────────────────────────────────────────────

def parse_rule_file(
    path: str,
    corpus_id: Optional[str] = None,
    is_demo: bool = False,
) -> SigmaRule:
    """Parse a single Sigma YAML rule file.

    Never raises — all errors are encoded in the returned SigmaRule.
    """
    file_path = Path(path)

    # ── size guard ─────────────────────────────────────────────────────────────
    try:
        if file_path.stat().st_size > _MAX_FILE_BYTES:
            return _invalid(path, corpus_id, is_demo, [
                f"File exceeds 1 MB size limit ({file_path.stat().st_size:,} bytes)"
            ])
    except OSError as exc:
        return _invalid(path, corpus_id, is_demo, [f"Cannot access file: {exc}"])

    # ── read ────────────────────────────────────────────────────────────────────
    try:
        content_bytes = file_path.read_bytes()
    except OSError as exc:
        return _invalid(path, corpus_id, is_demo, [f"Cannot read file: {exc}"])

    chash = hashlib.sha256(content_bytes).hexdigest()[:16]
    raw_text = content_bytes.decode("utf-8", errors="replace")

    # ── YAML ───────────────────────────────────────────────────────────────────
    try:
        raw = yaml.safe_load(raw_text)
    except yaml.YAMLError as exc:
        return _invalid(path, corpus_id, is_demo, [f"Invalid YAML: {exc}"], chash)

    if not isinstance(raw, dict):
        return _invalid(path, corpus_id, is_demo, ["Root document is not a YAML mapping"], chash)

    warnings: list[str] = []

    # ── rule ID ────────────────────────────────────────────────────────────────
    raw_id = str(raw.get("id", "")).strip()
    if not raw_id:
        rule_id = _auto_id(path)
        warnings.append(f"No 'id' field; auto-generated: {rule_id}")
    else:
        rule_id = raw_id

    # ── title ──────────────────────────────────────────────────────────────────
    title = _opt_str(raw.get("title"))
    if not title:
        warnings.append("Required field 'title' is missing or blank")

    # ── scalar fields ──────────────────────────────────────────────────────────
    description = _opt_str(raw.get("description"))
    status      = _opt_str(raw.get("status"))
    author      = _opt_str(raw.get("author"))
    date        = _opt_str(raw.get("date"))
    modified    = _opt_str(raw.get("modified"))

    # ── tags ───────────────────────────────────────────────────────────────────
    tags_raw = raw.get("tags", [])
    tags: list[str] = [str(t).lower() for t in tags_raw] if isinstance(tags_raw, list) else []
    tech_ids, tactic_tags = _extract_attack_tags(tags)

    if not tech_ids:
        warnings.append(
            "No ATT&CK technique tags found; this rule will not map to any techniques"
        )

    # ── logsource ──────────────────────────────────────────────────────────────
    ls_raw = raw.get("logsource")
    logsource: Optional[SigmaLogSource] = None
    if isinstance(ls_raw, dict):
        logsource = SigmaLogSource(
            category=_opt_str(ls_raw.get("category")),
            product=_opt_str(ls_raw.get("product")),
            service=_opt_str(ls_raw.get("service")),
        )
        if not any([logsource.category, logsource.product, logsource.service]):
            logsource = None

    # ── detection condition ────────────────────────────────────────────────────
    det_raw = raw.get("detection")
    detection_condition: Optional[str] = None
    if isinstance(det_raw, dict):
        cond = det_raw.get("condition")
        if isinstance(cond, list):
            detection_condition = " | ".join(str(c) for c in cond)
        elif cond is not None:
            detection_condition = str(cond)
    elif isinstance(det_raw, str):
        detection_condition = det_raw

    if not detection_condition:
        warnings.append("Field 'detection' is absent or has no condition")

    # ── falsepositives / references ────────────────────────────────────────────
    falsepositives = _str_list(raw.get("falsepositives", []))
    references     = _str_list(raw.get("references", []))

    # ── related ────────────────────────────────────────────────────────────────
    related_raw = raw.get("related", [])
    related: list[str] = []
    if isinstance(related_raw, list):
        related = [str(r.get("id", "")) for r in related_raw if isinstance(r, dict) and r.get("id")]

    parse_status = ParseStatus.PARSED_WITH_WARNINGS if warnings else ParseStatus.PARSED

    return SigmaRule(
        id=rule_id,
        file_path=str(file_path),
        content_hash=chash,
        parse_status=parse_status,
        parse_warnings=warnings,
        title=title,
        description=description,
        author=author,
        status=status,
        date=date,
        modified=modified,
        tags=tags,
        attack_technique_ids=tech_ids,
        attack_tactic_tags=tactic_tags,
        logsource=logsource,
        detection_condition=detection_condition,
        falsepositives=falsepositives,
        references=references,
        related=related,
        is_demo=is_demo,
        corpus_id=corpus_id,
    )


def parse_directory(
    path: str,
    recursive: bool = True,
    corpus_id: Optional[str] = None,
    is_demo: bool = False,
) -> tuple[list[SigmaRule], IngestionSummary]:
    """Parse all Sigma YAML files under *path*. Returns (rules, summary)."""
    if corpus_id is None:
        corpus_id = f"corpus-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}"

    base = Path(path)
    summary = IngestionSummary(corpus_id=corpus_id)

    if not base.exists() or not base.is_dir():
        summary.errors.append(f"Directory not found: {path}")
        return [], summary

    if recursive:
        files = sorted(list(base.rglob("*.yml")) + list(base.rglob("*.yaml")))
    else:
        files = sorted(list(base.glob("*.yml")) + list(base.glob("*.yaml")))
    # Deduplicate (rglob may overlap with glob on some OSes)
    files = list(dict.fromkeys(files))

    summary.files_discovered = len(files)
    rules: list[SigmaRule] = []
    seen_hashes: set[str] = set()
    seen_ids: dict[str, str] = {}

    for fpath in files:
        rule = parse_rule_file(str(fpath), corpus_id=corpus_id, is_demo=is_demo)

        # Duplicate detection by rule ID (primary) then content hash (secondary)
        if rule.parse_status != ParseStatus.INVALID:
            if rule.id in seen_ids:
                rule.parse_status = ParseStatus.DUPLICATE
                rule.parse_warnings = list(rule.parse_warnings) + [
                    f"Duplicate rule ID '{rule.id}'; first seen at {seen_ids[rule.id]}"
                ]
                summary.duplicates += 1
            else:
                seen_ids[rule.id] = str(fpath)
                # Also track content hash for content-identical duplicates
                if rule.content_hash:
                    seen_hashes.add(rule.content_hash)

        rules.append(rule)
        summary.total_rules += 1

        if rule.parse_status == ParseStatus.PARSED:
            summary.successfully_parsed += 1
        elif rule.parse_status == ParseStatus.PARSED_WITH_WARNINGS:
            summary.parsed_with_warnings += 1
        elif rule.parse_status == ParseStatus.INVALID:
            summary.invalid_files += 1

        if rule.attack_technique_ids:
            summary.rules_with_attack_tags += 1

    summary.completed_at = datetime.utcnow()
    return rules, summary


# ── Helpers ────────────────────────────────────────────────────────────────────

def _auto_id(path: str) -> str:
    return "auto-" + hashlib.sha256(path.encode()).hexdigest()[:8]


def _invalid(
    path: str,
    corpus_id: Optional[str],
    is_demo: bool,
    warnings: list[str],
    content_hash: str = "",
) -> SigmaRule:
    return SigmaRule(
        id=_auto_id(path),
        file_path=str(path),
        content_hash=content_hash,
        parse_status=ParseStatus.INVALID,
        parse_warnings=warnings,
        corpus_id=corpus_id,
        is_demo=is_demo,
    )


def _opt_str(value: object) -> Optional[str]:
    if value is None:
        return None
    s = str(value).strip()
    return s if s else None


def _str_list(value: object) -> list[str]:
    if isinstance(value, str):
        return [value] if value.strip() else []
    if isinstance(value, list):
        return [str(v) for v in value if v is not None]
    return []


def _extract_attack_tags(tags: list[str]) -> tuple[list[str], list[str]]:
    """Return (technique_ids, tactic_tags) from normalised Sigma tag list."""
    tech_ids: list[str] = []
    tactic_tags: list[str] = []
    for tag in tags:
        m = _TECHNIQUE_RE.match(tag.strip())
        if m:
            tid = m.group(1).upper()
            if tid not in tech_ids:
                tech_ids.append(tid)
        elif tag.startswith("attack."):
            suffix = tag[7:]
            if suffix in _ATTACK_TACTICS and suffix not in tactic_tags:
                tactic_tags.append(suffix)
    return tech_ids, tactic_tags
