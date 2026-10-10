"""Sigma rule validator for BLIND.

Validates a parsed SigmaRule for completeness and structural correctness.
Returns a RuleValidationResult — no mutations to the original rule.
"""

from __future__ import annotations

import re

from blind_engine.models import ParseStatus, RuleValidationResult, SigmaRule

# ATT&CK technique ID: T1234 or T1234.567
TECHNIQUE_ID_PATTERN = re.compile(r"^T\d{4}(\.\d{3})?$")

# UUID v4-like (loose)
_UUID_PATTERN = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)

# Broadly acceptable rule ID characters (e.g. "WIN-001", short slugs)
_ALPHANUM_ID_PATTERN = re.compile(r"^[A-Za-z0-9][\w.\-]{0,63}$")

# attack.* tag: technique or tactic slug
_ATTACK_TAG_PATTERN = re.compile(
    r"^attack\.(t\d{4}(?:\.\d{3})?|[a-z][\w-]*)$",
    re.IGNORECASE,
)

# Recognised Sigma rule status values
VALID_STATUSES: frozenset[str] = frozenset(
    {"stable", "test", "experimental", "deprecated", "unsupported"}
)

# Recognised Sigma severity levels
VALID_LEVELS: frozenset[str] = frozenset(
    {"critical", "high", "medium", "low", "informational"}
)

# ATT&CK Enterprise tactic short names
KNOWN_TACTIC_SLUGS: frozenset[str] = frozenset(
    {
        "initial-access",
        "execution",
        "persistence",
        "privilege-escalation",
        "defense-evasion",
        "credential-access",
        "discovery",
        "lateral-movement",
        "collection",
        "command-and-control",
        "exfiltration",
        "impact",
        "reconnaissance",
        "resource-development",
    }
)


def validate_rule(rule: SigmaRule) -> RuleValidationResult:
    """Validate a parsed SigmaRule for completeness and correctness.

    Checks performed:
    - Required fields: id, title (warning if missing/blank)
    - ID format: UUID v4, T-prefixed, or alphanumeric (warning if unusual)
    - Status enum: stable/test/experimental/deprecated/unsupported (warning)
    - Level enum: critical/high/medium/low/informational (warning)
    - Tag format: attack.* tags must match known patterns (warning)
    - Tactic slug: warn if unrecognised ATT&CK tactic name
    - ATT&CK technique IDs: must match T####[.###] pattern
    - Logsource: warn if completely empty
    - Detection condition: warn if absent

    Returns:
        RuleValidationResult with status INVALID, PARSED_WITH_WARNINGS, or PARSED.
    """
    errors: list[str] = []
    # Carry forward any warnings already recorded during parsing
    warnings: list[str] = list(rule.parse_warnings or [])

    # ── Propagate INVALID rules without re-running field checks ─────────────
    if rule.parse_status == ParseStatus.INVALID:
        return RuleValidationResult(
            rule_id=rule.id,
            file_path=rule.file_path,
            status=ParseStatus.INVALID,
            warnings=warnings,
            errors=[w for w in warnings if w.startswith("ERROR:")],
        )

    # DUPLICATE rules passed syntactic parsing — surface the duplicate warning
    if rule.parse_status == ParseStatus.DUPLICATE:
        return RuleValidationResult(
            rule_id=rule.id,
            file_path=rule.file_path,
            status=ParseStatus.PARSED_WITH_WARNINGS,
            warnings=warnings,
            errors=[],
        )

    # ── ID checks ────────────────────────────────────────────────────────────
    if not rule.id:
        errors.append("Rule ID is absent — cannot uniquely identify this rule")
    elif rule.id.startswith("auto-"):
        # Parser already warned; nothing extra needed here
        pass
    else:
        if (
            not _UUID_PATTERN.match(rule.id)
            and not _ALPHANUM_ID_PATTERN.match(rule.id)
        ):
            warnings.append(
                f"Rule ID '{rule.id}' has an unusual format "
                "(expected UUID v4, T-prefixed, or short alphanumeric)"
            )

    # ── title ────────────────────────────────────────────────────────────────
    if not rule.title or not str(rule.title).strip():
        warnings.append("Required field 'title' is missing or blank")

    # ── status ───────────────────────────────────────────────────────────────
    raw_status = rule.status  # plain optional string field on SigmaRule
    if not raw_status:
        warnings.append(
            "Field 'status' is missing "
            "(expected: stable, test, experimental, deprecated, unsupported)"
        )
    elif raw_status.lower() not in VALID_STATUSES:
        warnings.append(
            f"Status '{raw_status}' is not a recognised Sigma status value "
            f"(valid: {', '.join(sorted(VALID_STATUSES))})"
        )

    # ── level ────────────────────────────────────────────────────────────────
    if rule.level and rule.level.lower() not in VALID_LEVELS:
        warnings.append(
            f"Level '{rule.level}' is not a recognised Sigma severity level "
            f"(valid: {', '.join(sorted(VALID_LEVELS))})"
        )

    # ── tag format ───────────────────────────────────────────────────────────
    for tag in rule.tags or []:
        tag_lower = tag.strip().lower()
        if tag_lower.startswith("attack."):
            if not _ATTACK_TAG_PATTERN.match(tag_lower):
                warnings.append(
                    f"Tag '{tag}' starts with 'attack.' but has an unexpected format"
                )
            else:
                suffix = tag_lower[len("attack."):]
                # If not a technique ID prefix, check it's a known tactic slug
                if not re.match(r"^t\d{4}", suffix) and suffix not in KNOWN_TACTIC_SLUGS:
                    warnings.append(
                        f"Tactic tag '{tag}' uses an unrecognised tactic slug '{suffix}'"
                    )

    # ── ATT&CK technique ID format ────────────────────────────────────────────
    for tid in rule.attack_technique_ids or []:
        if not TECHNIQUE_ID_PATTERN.match(tid):
            warnings.append(
                f"Extracted ATT&CK technique ID '{tid}' does not match "
                "the expected format T####[.###]"
            )

    # ── logsource ────────────────────────────────────────────────────────────
    if not rule.logsource:
        warnings.append(
            "Field 'logsource' is absent; rule cannot be filtered by log type"
        )
    else:
        ls = rule.logsource
        if not any([ls.category, ls.product, ls.service]):
            warnings.append(
                "Field 'logsource' contains no category, product, or service — "
                "it is effectively empty and provides no log-targeting information"
            )

    # ── detection ────────────────────────────────────────────────────────────
    if not rule.detection_condition:
        warnings.append(
            "Field 'detection' is absent or empty; rule has no detection logic defined"
        )

    # ── derive final status ───────────────────────────────────────────────────
    if errors:
        final_status = ParseStatus.INVALID
    elif warnings:
        final_status = ParseStatus.PARSED_WITH_WARNINGS
    else:
        final_status = ParseStatus.PARSED

    return RuleValidationResult(
        rule_id=rule.id,
        file_path=rule.file_path,
        status=final_status,
        warnings=warnings,
        errors=errors,
    )
