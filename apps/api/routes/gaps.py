"""Gap assessment endpoints."""
from typing import Optional

from fastapi import APIRouter, Depends, Query

from apps.api.services.analysis import AnalysisState, get_state

router = APIRouter(tags=["gaps"])


@router.get("/gaps", summary="Get prioritised gap assessments")
async def get_gaps(
    corpus_id: Optional[str] = Query(None, description="Corpus override (defaults to current)"),
    min_score: Optional[float] = Query(None, ge=0, le=100, description="Minimum priority score"),
    tactic: Optional[str] = Query(None, description="Filter by tactic short-name"),
    sort_by: str = Query(
        "priority",
        pattern="^(priority|coverage|name)$",
        description="Sort field: priority (default), coverage, name",
    ),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    state: AnalysisState = Depends(get_state),
) -> dict:
    """Return prioritised gap assessments.

    Gaps are sorted by ``priority_score`` descending by default, which puts
    the most actionable uncovered techniques first.
    """
    cid = corpus_id or state.current_corpus_id or ""
    gaps = await state.db.get_gaps(cid, min_score, tactic)

    if sort_by == "coverage":
        gaps.sort(key=lambda g: g.coverage_score)
    elif sort_by == "name":
        gaps.sort(key=lambda g: g.technique_name.lower())
    # "priority" is already the DB default sort (priority_rank ASC)

    total = len(gaps)
    return {
        "data": [g.model_dump(mode="json") for g in gaps[skip : skip + limit]],
        "total": total,
        "page": skip // limit if limit else 0,
    }
