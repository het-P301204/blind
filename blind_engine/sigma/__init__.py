"""Sigma rule parsing and validation — public API."""
from __future__ import annotations
from typing import Optional, Tuple

from blind_engine.sigma.parser import parse_rule_file as _parse_rule_file
from blind_engine.sigma.parser import parse_directory as _parse_directory
from blind_engine.sigma.validator import validate_rule
from blind_engine.models import (
    ParseStatus,
    SigmaRule,
    IngestionSummary,
    RuleValidationResult,
)


def parse_rule_file(
    path: str,
    corpus_id: Optional[str] = None,
    is_demo: bool = False,
) -> Tuple[Optional[SigmaRule], ParseStatus]:
    """Parse a single Sigma YAML file.

    Returns (rule, status). rule is None when the file cannot be read/does not exist.
    """
    import os
    if not os.path.exists(path):
        return None, ParseStatus.INVALID
    rule = _parse_rule_file(path, corpus_id=corpus_id, is_demo=is_demo)
    if rule is None:
        return None, ParseStatus.INVALID
    status = rule.parse_status or ParseStatus.PARSED
    # If INVALID and no content could be extracted, return None rule
    if status == ParseStatus.INVALID:
        return None, ParseStatus.INVALID
    return rule, status


def parse_directory(
    path: str,
    recursive: bool = True,
    corpus_id: Optional[str] = None,
    is_demo: bool = False,
) -> Tuple[IngestionSummary, list[SigmaRule]]:
    """Parse a directory of Sigma YAML files.

    Returns (summary, rules) — summary first.
    Raises FileNotFoundError if directory does not exist.
    """
    import os
    if not os.path.isdir(path):
        raise FileNotFoundError(f"Directory not found: {path}")
    rules, summary = _parse_directory(path, recursive=recursive, corpus_id=corpus_id, is_demo=is_demo)
    return summary, rules


__all__ = ["parse_rule_file", "parse_directory", "validate_rule"]
