"""Calculate ATT&CK technique coverage scores from mapped Sigma rules."""
import math
from blind_engine.models import (
    AttackDataset,
    CoverageConfig,
    CoverageLevel,
    CoverageResult,
    DeploymentStatus,
    SigmaRule,
    TechniqueMapping,
    TelemetryStatus,
    ValidationStatus,
)

_DEFAULT_CONFIG = CoverageConfig()


def _maturity_weight(status: str | None, config: CoverageConfig) -> float:
    """Return the configured weight for a rule's maturity status."""
    if not status:
        return 0.5
    return config.maturity_weights.get(status.lower(), 0.5)


def _compute_score(
    rules: list[SigmaRule],
    config: CoverageConfig,
) -> tuple[float, dict[str, int], str]:
    """Return (score 0-100, maturity_distribution, formula_string).

    Uses a diminishing-returns exponential model so that the first rule gives
    the biggest lift and each additional rule contributes progressively less.
    """
    if not rules:
        return 0.0, {}, "no_rules"

    weighted_sum = sum(_maturity_weight(r.status, config) for r in rules)
    raw = (1.0 - math.exp(-config.lambda_factor * weighted_sum)) * 100.0
    score = round(min(raw, 100.0), 2)

    maturity_dist: dict[str, int] = {}
    for r in rules:
        key = (r.status or "unknown").lower()
        maturity_dist[key] = maturity_dist.get(key, 0) + 1

    formula = (
        f"score=(1-exp(-{config.lambda_factor}*{round(weighted_sum, 3)}))*100"
        f" = {score:.2f}"
    )
    return score, maturity_dist, formula


def _coverage_level(score: float, config: CoverageConfig) -> CoverageLevel:
    if score <= 0:
        return CoverageLevel.NO_MAPPED_COVERAGE
    if score < config.thresholds["limited"]:
        return CoverageLevel.LIMITED
    if score < config.thresholds["partial"]:
        return CoverageLevel.PARTIAL
    return CoverageLevel.STRONG


def calculate_coverage(
    mappings: list[TechniqueMapping],
    rules_by_id: dict[str, SigmaRule],
    dataset: AttackDataset,
    config: CoverageConfig = _DEFAULT_CONFIG,
) -> list[CoverageResult]:
    """Calculate coverage for *every* technique in *dataset*.

    Techniques with no mapped rules receive a score of 0 / NO_MAPPED_COVERAGE.
    """
    mapping_by_tech: dict[str, TechniqueMapping] = {m.technique_id: m for m in mappings}
    results: list[CoverageResult] = []

    for tech_id, tech in dataset.techniques.items():
        mapping = mapping_by_tech.get(tech_id)

        if mapping:
            mapped_rules = [rules_by_id[rid] for rid in mapping.rule_ids if rid in rules_by_id]
            score, maturity_dist, formula = _compute_score(mapped_rules, config)
            rule_count = len(mapping.rule_ids)
            rule_ids = list(mapping.rule_ids)
        else:
            mapped_rules = []
            score = 0.0
            maturity_dist = {}
            formula = "no_rules"
            rule_count = 0
            rule_ids = []

        results.append(
            CoverageResult(
                technique_id=tech_id,
                technique_name=tech.name,
                tactics=list(tech.tactics),
                mapped_rule_count=rule_count,
                mapped_rule_ids=rule_ids,
                coverage_score=score,
                coverage_level=_coverage_level(score, config),
                telemetry_status=TelemetryStatus.UNKNOWN,
                validation_status=ValidationStatus.NOT_TESTED,
                deployment_status=DeploymentStatus.UNKNOWN,
                maturity_distribution=maturity_dist,
                scoring_formula=formula,
            )
        )

    return results
