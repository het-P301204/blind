"""Health and version endpoints."""
from fastapi import APIRouter, Depends

from apps.api.services.analysis import AnalysisState, get_state

router = APIRouter(tags=["health"])


@router.get("/health", summary="Platform health check")
async def health_check(state: AnalysisState = Depends(get_state)) -> dict:
    """Return the operational status and loaded-state summary."""
    return {
        "status": "ok",
        "version": "0.1.0",
        "demo_loaded": state.demo_loaded,
        "attack_dataset_loaded": state.attack_dataset is not None,
        "attack_dataset_version": state.attack_dataset.version if state.attack_dataset else None,
        "current_corpus_id": state.current_corpus_id,
        "rule_count": len(state.current_rules),
        "coverage_count": len(state.current_coverage),
        "gap_count": len(state.current_gaps),
    }


@router.get("/version", summary="API version info")
async def version_info() -> dict:
    return {
        "version": "0.1.0",
        "name": "BLIND",
        "description": "Detection Coverage Intelligence Platform",
    }
