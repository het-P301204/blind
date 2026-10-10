"""Export endpoints: Navigator layer, JSON report, CSV gaps, PDF report."""
import io
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

from blind_engine.export.csv_exporter import export_gaps_csv
from blind_engine.export.json_exporter import export_analysis_json
from blind_engine.export.navigator import export_navigator_layer
from blind_engine.export.pdf_reporter import export_pdf_report
from blind_engine.models import IngestionSummary
from apps.api.services.analysis import AnalysisState, get_state

router = APIRouter(tags=["export"])


class ExportRequest(BaseModel):
    format: Literal["pdf", "json", "csv"] = "json"


def _require_coverage(state: AnalysisState) -> None:
    if not state.current_coverage:
        raise HTTPException(
            status_code=400,
            detail="No coverage data available — run ingestion first",
        )


def _build_summary(state: AnalysisState) -> IngestionSummary:
    """Synthesise a minimal IngestionSummary from current state."""
    return IngestionSummary(
        corpus_id=state.current_corpus_id or "default",
        total_rules=len(state.current_rules),
        rules_with_attack_tags=sum(1 for r in state.current_rules if r.attack_technique_ids),
    )


@router.post("/export/navigator", summary="Export ATT&CK Navigator layer", response_model=None)
async def export_navigator(state: AnalysisState = Depends(get_state)) -> JSONResponse:
    """Generate a Navigator 4.x layer JSON from current coverage results."""
    _require_coverage(state)
    if not state.attack_dataset:
        raise HTTPException(status_code=400, detail="No ATT&CK dataset loaded")
    layer = export_navigator_layer(
        state.current_coverage,
        state.attack_dataset,
        state.current_corpus_id or "default",
    )
    return JSONResponse(content=layer)


@router.post("/export/report", summary="Export analysis report", response_model=None)
async def export_report(
    req: ExportRequest,
    state: AnalysisState = Depends(get_state),
) -> StreamingResponse | JSONResponse:
    """Export the full analysis as JSON, CSV, or PDF."""
    _require_coverage(state)
    summary = _build_summary(state)
    dataset_version = state.attack_dataset.version if state.attack_dataset else "unknown"

    if req.format == "json":
        data = export_analysis_json(
            state.current_coverage,
            state.current_gaps,
            summary,
            state.attack_dataset,
        )
        return JSONResponse(content=data)

    if req.format == "csv":
        csv_str = export_gaps_csv(state.current_gaps)
        return StreamingResponse(
            io.StringIO(csv_str),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=blind-gaps.csv"},
        )

    if req.format == "pdf":
        pdf_bytes = export_pdf_report(
            state.current_coverage,
            state.current_gaps,
            summary,
            dataset_version,
        )
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=blind-report.pdf"},
        )

    raise HTTPException(status_code=400, detail=f"Unsupported export format: {req.format!r}")


@router.get("/datasets", summary="List available datasets and snapshots")
async def list_datasets(state: AnalysisState = Depends(get_state)) -> dict:
    """Return metadata about the currently loaded ATT&CK dataset and snapshots."""
    snaps = await state.db.list_snapshots()
    return {
        "attack_version": state.attack_dataset.version if state.attack_dataset else None,
        "current_corpus_id": state.current_corpus_id,
        "snapshots": [s.model_dump(mode="json") for s in snaps],
    }
