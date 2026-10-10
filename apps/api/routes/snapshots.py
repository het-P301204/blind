"""Corpus snapshot and diff endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from blind_engine.ingestion.snapshotter import compare_snapshots, create_snapshot
from apps.api.services.analysis import AnalysisState, get_state

router = APIRouter(tags=["snapshots"])


class SnapshotRequest(BaseModel):
    label: str = Field("Manual snapshot", max_length=200)


class CompareRequest(BaseModel):
    snapshot_a: str = Field(..., max_length=200)
    snapshot_b: str = Field(..., max_length=200)


@router.get("/snapshots", summary="List corpus snapshots")
async def list_snapshots(state: AnalysisState = Depends(get_state)) -> dict:
    """Return all saved corpus snapshots, newest first."""
    snaps = await state.db.list_snapshots()
    return {"data": [s.model_dump(mode="json") for s in snaps], "total": len(snaps)}


@router.post("/snapshots", summary="Create a corpus snapshot")
async def create_snapshot_endpoint(
    req: SnapshotRequest,
    state: AnalysisState = Depends(get_state),
) -> dict:
    """Snapshot the current corpus state and persist it."""
    if not state.current_corpus_id:
        raise HTTPException(status_code=400, detail="No corpus is currently loaded")
    if not state.current_coverage:
        raise HTTPException(
            status_code=400, detail="No coverage data available — run ingestion first"
        )

    attack_version = state.attack_dataset.version if state.attack_dataset else "unknown"
    snap = create_snapshot(
        corpus_id=state.current_corpus_id,
        rules=state.current_rules,
        coverage=state.current_coverage,
        label=req.label,
        attack_version=attack_version,
    )
    await state.db.save_snapshot(snap)
    return snap.model_dump(mode="json")


@router.get("/snapshots/{snapshot_id}", summary="Get a single snapshot")
async def get_snapshot(
    snapshot_id: str,
    state: AnalysisState = Depends(get_state),
) -> dict:
    snap = await state.db.get_snapshot(snapshot_id)
    if not snap:
        raise HTTPException(status_code=404, detail=f"Snapshot '{snapshot_id}' not found")
    return snap.model_dump(mode="json")


@router.post("/compare", summary="Diff two corpus snapshots")
async def compare_snapshots_endpoint(
    req: CompareRequest,
    state: AnalysisState = Depends(get_state),
) -> dict:
    """Compare two snapshots and return a SnapshotDiff."""
    snap_a = await state.db.get_snapshot(req.snapshot_a)
    snap_b = await state.db.get_snapshot(req.snapshot_b)
    if not snap_a:
        raise HTTPException(status_code=404, detail=f"Snapshot '{req.snapshot_a}' not found")
    if not snap_b:
        raise HTTPException(status_code=404, detail=f"Snapshot '{req.snapshot_b}' not found")

    # Load the rule and coverage sets for each snapshot corpus
    rules_a = await state.db.list_rules(corpus_id=snap_a.corpus_id, skip=0, limit=10_000)
    rules_b = await state.db.list_rules(corpus_id=snap_b.corpus_id, skip=0, limit=10_000)
    coverage_a = await state.db.get_coverage(snap_a.corpus_id)
    coverage_b = await state.db.get_coverage(snap_b.corpus_id)

    diff = compare_snapshots(snap_a, snap_b, rules_a, rules_b, coverage_a, coverage_b)
    return diff.model_dump(mode="json")
