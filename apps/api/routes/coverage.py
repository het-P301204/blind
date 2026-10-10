"""Coverage result endpoints."""
from typing import Optional

from fastapi import APIRouter, Depends, Query

from apps.api.services.analysis import AnalysisState, get_state

router = APIRouter(tags=["coverage"])


@router.get("/coverage", summary="Get coverage results for all techniques")
async def get_coverage(
    corpus_id: Optional[str] = Query(None, description="Corpus override (defaults to current)"),
    tactic: Optional[str] = Query(None, description="Filter by tactic short-name"),
    state: AnalysisState = Depends(get_state),
) -> dict:
    """Return all coverage results, optionally filtered by tactic.

    Also returns aggregate statistics in ``stats``.
    """
    cid = corpus_id or state.current_corpus_id or ""
    results = await state.db.get_coverage(cid)

    if tactic:
        results = [r for r in results if tactic.lower() in [t.lower() for t in r.tactics]]

    covered = [r for r in results if r.coverage_score > 0]
    mean_score = sum(r.coverage_score for r in results) / len(results) if results else 0.0

    # Per-tactic breakdown
    tactic_breakdown: dict[str, dict] = {}
    for r in results:
        for t in r.tactics:
            entry = tactic_breakdown.setdefault(t, {"total": 0, "covered": 0, "mean_score": 0.0})
            entry["total"] += 1
            if r.coverage_score > 0:
                entry["covered"] += 1
            entry["mean_score"] = round(
                (entry["mean_score"] * (entry["total"] - 1) + r.coverage_score) / entry["total"], 2
            )

    return {
        "data": [r.model_dump(mode="json") for r in results],
        "total": len(results),
        "stats": {
            "covered_techniques": len(covered),
            "total_techniques": len(results),
            "mean_coverage_score": round(mean_score, 2),
            "tactic_breakdown": tactic_breakdown,
        },
    }
