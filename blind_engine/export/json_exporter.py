"""Export the full analysis result set to a structured JSON dict."""
from datetime import datetime
from typing import Optional

from blind_engine.models import (
    AttackDataset, CoverageLevel, CoverageResult, GapAssessment, IngestionSummary
)


def export_analysis_json(
    coverage: list[CoverageResult],
    gaps: list[GapAssessment],
    summary: Optional[IngestionSummary],
    dataset: Optional[AttackDataset],
) -> dict:
    """Return a JSON-serialisable dict with the complete analysis.

    Structure follows the spec:
    {
      "metadata": {...},
      "summary": {...},
      "coverage": {"total_techniques": N, "covered_techniques": N,
                   "mean_score": float, "by_level": {...}, "techniques": [...]},
      "gaps": {"total_gaps": N, "top_10": [...], "all_gaps": [...]}
    }
    """
    covered = [c for c in coverage if c.coverage_score > 0]
    mean_score = sum(c.coverage_score for c in coverage) / len(coverage) if coverage else 0.0

    # Coverage level breakdown
    by_level: dict[str, int] = {lv.value: 0 for lv in CoverageLevel}
    for cov in coverage:
        by_level[cov.coverage_level.value] += 1

    corpus_id = summary.corpus_id if summary else "unknown"
    total_rules = summary.total_rules if summary else 0
    attack_version = dataset.version if dataset else "unknown"

    return {
        "metadata": {
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "attack_version": attack_version,
            "corpus_id": corpus_id,
            "total_rules": total_rules,
        },
        "summary": summary.model_dump(mode="json") if summary else None,
        "coverage": {
            "total_techniques": len(coverage),
            "covered_techniques": len(covered),
            "mean_score": round(mean_score, 2),
            "by_level": by_level,
            "techniques": [c.model_dump(mode="json") for c in coverage],
        },
        "gaps": {
            "total_gaps": len(gaps),
            "top_10": [g.model_dump(mode="json") for g in gaps[:10]],
            "all_gaps": [g.model_dump(mode="json") for g in gaps],
        },
    }
