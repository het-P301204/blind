"""Coverage level classification helpers."""
from blind_engine.models import CoverageConfig, CoverageLevel

_DEFAULT_CONFIG = CoverageConfig()


def classify_coverage_level(
    score: float,
    config: CoverageConfig = _DEFAULT_CONFIG,
) -> CoverageLevel:
    """Map a numeric coverage score (0-100) to a CoverageLevel enum value."""
    if score <= 0:
        return CoverageLevel.NO_MAPPED_COVERAGE
    if score < config.thresholds["limited"]:
        return CoverageLevel.LIMITED
    if score < config.thresholds["partial"]:
        return CoverageLevel.PARTIAL
    return CoverageLevel.STRONG
