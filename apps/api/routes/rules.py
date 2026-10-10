"""Sigma rule list and detail endpoints."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from apps.api.services.analysis import AnalysisState, get_state

router = APIRouter(tags=["rules"])


@router.get("/rules", summary="List ingested Sigma rules")
async def list_rules(
    skip: int = Query(0, ge=0, description="Pagination offset"),
    limit: int = Query(50, ge=1, le=500, description="Page size"),
    technique_id: Optional[str] = Query(None, description="Filter by ATT&CK technique ID"),
    status: Optional[str] = Query(None, description="Filter by parse status"),
    maturity: Optional[str] = Query(None, description="Filter by rule maturity (status field)"),
    search: Optional[str] = Query(None, description="Full-text search on title/description"),
    corpus_id: Optional[str] = Query(None, description="Corpus override (defaults to current)"),
    state: AnalysisState = Depends(get_state),
) -> dict:
    """Return a paginated list of Sigma rules.

    ``total`` reflects the raw DB count **before** the in-memory search filter.
    """
    cid = corpus_id or state.current_corpus_id
    rules = await state.db.list_rules(
        corpus_id=cid,
        technique_id=technique_id,
        status=status,
        maturity=maturity,
        skip=skip,
        limit=limit,
    )
    total = await state.db.count_rules(corpus_id=cid)

    # In-memory search filter on title / description
    if search:
        q = search.lower()
        rules = [
            r
            for r in rules
            if (r.title and q in r.title.lower())
            or (r.description and q in r.description.lower())
        ]

    return {
        "data": [r.model_dump(mode="json") for r in rules],
        "total": total,
        "page": skip // limit if limit else 0,
    }


@router.get("/rules/{rule_id}", summary="Get a single Sigma rule")
async def get_rule(
    rule_id: str,
    state: AnalysisState = Depends(get_state),
) -> dict:
    """Return full detail for a single Sigma rule."""
    rule = await state.db.get_rule(rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail=f"Rule '{rule_id}' not found")
    return rule.model_dump(mode="json")
