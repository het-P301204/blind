"""Prioritize ATT&CK coverage gaps and produce ranked GapAssessment list."""
from blind_engine.models import (
    AttackDataset,
    CoverageLevel,
    CoverageResult,
    DeploymentStatus,
    GapAssessment,
    PriorityConfig,
    PriorityFactor,
    TelemetryStatus,
    ValidationStatus,
)

_DEFAULT_CONFIG = PriorityConfig()

# ── Factor helpers ─────────────────────────────────────────────────────────────

def _gap_magnitude(coverage_score: float) -> float:
    """0 = fully covered, 1 = no coverage."""
    return max(0.0, 1.0 - coverage_score / 100.0)


def _telemetry_factor(status: TelemetryStatus) -> float:
    """Higher value = more urgent (MISSING = no telemetry = highest urgency)."""
    return {
        TelemetryStatus.MISSING: 1.0,
        TelemetryStatus.PARTIAL: 0.5,
        TelemetryStatus.AVAILABLE: 0.0,
        TelemetryStatus.UNKNOWN: 0.3,
    }.get(status, 0.3)


def _deployment_factor(status: DeploymentStatus) -> float:
    """Higher value = more urgent (NOT_CONFIGURED = not deployed = highest urgency)."""
    return {
        DeploymentStatus.NOT_CONFIGURED: 1.0,
        DeploymentStatus.PLANNED: 0.5,
        DeploymentStatus.DEPLOYED: 0.0,
        DeploymentStatus.DISABLED: 0.8,
        DeploymentStatus.UNKNOWN: 0.5,
    }.get(status, 0.5)


def _validation_urgency(status: ValidationStatus) -> float:
    """Higher value = more urgent (NOT_TESTED = unknown risk = highest urgency)."""
    return {
        ValidationStatus.NOT_TESTED: 1.0,
        ValidationStatus.PLANNED: 0.5,
        ValidationStatus.PASSED: 0.0,
        ValidationStatus.TESTED: 0.3,
        ValidationStatus.FAILED: 0.8,
        ValidationStatus.INCONCLUSIVE: 0.6,
    }.get(status, 0.5)


def _recommended_action(cov: CoverageResult) -> str:
    level = cov.coverage_level
    if level == CoverageLevel.NO_MAPPED_COVERAGE:
        return "Create new detection rule for this technique"
    if level == CoverageLevel.LIMITED:
        return "Add additional detection rules to improve coverage breadth"
    if level == CoverageLevel.PARTIAL:
        return "Review and expand existing rules to close edge-case gaps"
    return "Validate and test existing detection rules"


# ── Main prioritisation ────────────────────────────────────────────────────────

def prioritize_gaps(
    coverage: list[CoverageResult],
    dataset: AttackDataset,
    config: PriorityConfig = _DEFAULT_CONFIG,
) -> list[GapAssessment]:
    """Produce a priority-ranked GapAssessment for every technique in *coverage*.

    Scoring weights are defined in PriorityConfig.  The final priority_score is
    normalised to 0-100.  Techniques are sorted descending (highest priority first)
    and assigned integer priority_rank values starting at 1.
    """
    total_tactics = max(len(dataset.tactics), 1)
    assessments: list[GapAssessment] = []

    for cov in coverage:
        tactic_breadth = len(cov.tactics) / total_tactics

        gap_val = _gap_magnitude(cov.coverage_score)
        tel_val = _telemetry_factor(cov.telemetry_status)
        dep_val = _deployment_factor(cov.deployment_status)
        val_val = _validation_urgency(cov.validation_status)
        biz_val = min(1.0, 0.4 + tactic_breadth * 0.6)
        threat_val = 0.6  # static placeholder; integrate threat-intel feeds here

        factors = [
            PriorityFactor(
                name="coverage_gap",
                value=round(gap_val, 4),
                weight=config.coverage_gap_weight,
                contribution=round(gap_val * config.coverage_gap_weight, 4),
                description="Inverse of current coverage score (higher gap → higher priority)",
            ),
            PriorityFactor(
                name="telemetry_readiness",
                value=round(tel_val, 4),
                weight=config.telemetry_readiness_weight,
                contribution=round(tel_val * config.telemetry_readiness_weight, 4),
                description="Data-source availability required for detection",
            ),
            PriorityFactor(
                name="deployment_confidence",
                value=round(dep_val, 4),
                weight=config.deployment_confidence_weight,
                contribution=round(dep_val * config.deployment_confidence_weight, 4),
                description="SIEM/EDR deployment readiness for rule activation",
            ),
            PriorityFactor(
                name="validation_urgency",
                value=round(val_val, 4),
                weight=config.validation_confidence_weight,
                contribution=round(val_val * config.validation_confidence_weight, 4),
                description="Urgency of validation/testing for this technique",
            ),
            PriorityFactor(
                name="business_criticality",
                value=round(biz_val, 4),
                weight=config.business_criticality_weight,
                contribution=round(biz_val * config.business_criticality_weight, 4),
                description="Technique breadth across ATT&CK tactics",
            ),
            PriorityFactor(
                name="threat_relevance",
                value=round(threat_val, 4),
                weight=config.threat_relevance_weight,
                contribution=round(threat_val * config.threat_relevance_weight, 4),
                description="Relevance to current threat landscape",
            ),
        ]

        total_weight = sum(f.weight for f in factors)
        raw_score = sum(f.contribution for f in factors) / total_weight if total_weight else 0.0
        priority_score = round(raw_score * 100, 2)

        # Telemetry dependencies from the ATT&CK dataset
        tech = dataset.techniques.get(cov.technique_id)
        telemetry_deps: list[str] = []
        if tech:
            for ds in tech.data_sources[:5]:
                label = f"{ds.name}: {ds.component}" if ds.component else ds.name
                telemetry_deps.append(label)

        assessments.append(
            GapAssessment(
                technique_id=cov.technique_id,
                technique_name=cov.technique_name,
                tactics=list(cov.tactics),
                priority_score=priority_score,
                priority_rank=0,  # set after sort
                priority_factors=factors,
                mapped_rule_count=cov.mapped_rule_count,
                coverage_score=cov.coverage_score,
                coverage_level=cov.coverage_level,
                telemetry_status=cov.telemetry_status,
                deployment_status=cov.deployment_status,
                validation_status=cov.validation_status,
                recommended_action=_recommended_action(cov),
                telemetry_dependencies=telemetry_deps,
            )
        )

    # Sort descending by priority_score; break ties by technique_id for stability
    assessments.sort(key=lambda a: (-a.priority_score, a.technique_id))
    for rank, assessment in enumerate(assessments, start=1):
        assessment.priority_rank = rank

    return assessments
