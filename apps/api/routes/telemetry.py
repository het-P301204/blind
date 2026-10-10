"""Telemetry source CRUD endpoints."""
from fastapi import APIRouter, Depends, HTTPException

from blind_engine.models import TelemetrySource
from apps.api.services.analysis import AnalysisState, get_state

router = APIRouter(tags=["telemetry"])


@router.get("/telemetry", summary="List telemetry sources")
async def list_telemetry(state: AnalysisState = Depends(get_state)) -> dict:
    """Return all registered telemetry sources."""
    sources = await state.db.list_telemetry()
    return {"data": [s.model_dump(mode="json") for s in sources], "total": len(sources)}


@router.post("/telemetry", summary="Create or update a telemetry source")
async def upsert_telemetry(
    source: TelemetrySource,
    state: AnalysisState = Depends(get_state),
) -> dict:
    """Upsert a TelemetrySource record by its ID."""
    await state.db.upsert_telemetry(source)
    return source.model_dump(mode="json")


@router.get("/telemetry/{source_id}", summary="Get a single telemetry source")
async def get_telemetry(
    source_id: str,
    state: AnalysisState = Depends(get_state),
) -> dict:
    """Return a single telemetry source by ID."""
    all_sources = await state.db.list_telemetry()
    source = next((s for s in all_sources if s.id == source_id), None)
    if not source:
        raise HTTPException(status_code=404, detail=f"Telemetry source '{source_id}' not found")
    return source.model_dump(mode="json")
