"""ATT&CK technique list and detail endpoints."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from apps.api.services.analysis import AnalysisState, get_state

router = APIRouter(tags=["techniques"])


@router.get("/techniques", summary="List ATT&CK techniques with coverage info")
async def list_techniques(
    tactic: Optional[str] = Query(None, description="Filter by tactic short-name"),
    platform: Optional[str] = Query(None, description="Filter by platform (Windows/Linux/…)"),
    coverage_level: Optional[str] = Query(None, description="Filter by coverage level"),
    skip: int = Query(0, ge=0),
    limit: int = Query(200, ge=1, le=1000),
    state: AnalysisState = Depends(get_state),
) -> dict:
    """Return ATT&CK techniques joined with their current coverage information."""
    techniques = await state.db.list_techniques()
    coverage_map = {c.technique_id: c for c in state.current_coverage}

    results = []
    for tech in techniques:
        if tactic and tactic.lower() not in [t.lower() for t in tech.tactics]:
            continue
        if platform and platform.lower() not in [p.lower() for p in tech.platforms]:
            continue
        cov = coverage_map.get(tech.id)
        if coverage_level and (not cov or cov.coverage_level.value != coverage_level):
            continue
        item = tech.model_dump(mode="json")
        item["coverage"] = cov.model_dump(mode="json") if cov else None
        results.append(item)

    total = len(results)
    return {
        "data": results[skip : skip + limit],
        "total": total,
        "page": skip // limit if limit else 0,
    }


@router.get("/techniques/{technique_id}", summary="Get a single technique with full detail")
async def get_technique(
    technique_id: str,
    state: AnalysisState = Depends(get_state),
) -> dict:
    """Return technique detail, its coverage result, gap assessment, and mapped rules."""
    tech = await state.db.get_technique(technique_id)
    if not tech:
        raise HTTPException(status_code=404, detail=f"Technique '{technique_id}' not found")

    cid = state.current_corpus_id or ""
    cov_list = await state.db.get_coverage(cid)
    cov = next((c for c in cov_list if c.technique_id == technique_id), None)

    gap_list = await state.db.get_gaps(cid, None, None)
    gap = next((g for g in gap_list if g.technique_id == technique_id), None)

    # Fetch mapped rules
    mapped_rules = []
    if cov and cov.mapped_rule_ids:
        for rid in cov.mapped_rule_ids:
            rule = await state.db.get_rule(rid)
            if rule:
                mapped_rules.append(rule.model_dump(mode="json"))

    return {
        "technique": tech.model_dump(mode="json"),
        "coverage": cov.model_dump(mode="json") if cov else None,
        "gap_assessment": gap.model_dump(mode="json") if gap else None,
        "mapped_rules": mapped_rules,
    }
