"""Validation record CRUD endpoints."""
from fastapi import APIRouter, Depends, HTTPException

from blind_engine.models import ValidationRecord
from apps.api.services.analysis import AnalysisState, get_state

router = APIRouter(tags=["validation"])


@router.get("/validation", summary="List validation records")
async def list_validations(state: AnalysisState = Depends(get_state)) -> dict:
    """Return all validation records."""
    records = await state.db.list_validations()
    return {"data": [r.model_dump(mode="json") for r in records], "total": len(records)}


@router.post("/validation", summary="Create or update a validation record")
async def upsert_validation(
    record: ValidationRecord,
    state: AnalysisState = Depends(get_state),
) -> dict:
    """Upsert a ValidationRecord by its ID."""
    await state.db.upsert_validation(record)
    return record.model_dump(mode="json")


@router.get("/validation/{record_id}", summary="Get a single validation record")
async def get_validation(
    record_id: str,
    state: AnalysisState = Depends(get_state),
) -> dict:
    """Return a single validation record by ID."""
    all_records = await state.db.list_validations()
    record = next((r for r in all_records if r.id == record_id), None)
    if not record:
        raise HTTPException(
            status_code=404, detail=f"Validation record '{record_id}' not found"
        )
    return record.model_dump(mode="json")
