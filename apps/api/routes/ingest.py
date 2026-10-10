"""Ingestion endpoints: start a corpus ingest job, poll for status."""
from __future__ import annotations

import uuid
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, Field

from blind_engine.models import IngestionJob, JobStatus
from apps.api.services.analysis import AnalysisState, get_state

router = APIRouter(tags=["ingest"])


class IngestRequest(BaseModel):
    path: str = Field("", max_length=1024)
    type: Literal["directory", "file", "demo"] = "directory"


def _validate_path(path: str, ingest_type: str) -> None:
    """Raise HTTPException for unsafe or out-of-bounds paths."""
    if ingest_type == "demo":
        return  # path is ignored for demo

    if not path:
        raise HTTPException(status_code=400, detail="'path' must not be empty")

    try:
        resolved = Path(path).resolve()
    except (ValueError, OSError):
        raise HTTPException(status_code=400, detail="Invalid path")

    home = Path.home().resolve()
    try:
        resolved.relative_to(home)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Path outside allowed directories",
        )


@router.post("/ingest", summary="Start a corpus ingestion job")
async def start_ingest(
    req: IngestRequest,
    background_tasks: BackgroundTasks,
    state: AnalysisState = Depends(get_state),
) -> dict:
    """Kick off a background ingestion job.

    Returns ``{"job_id": ..., "corpus_id": ...}`` immediately; poll
    ``GET /api/ingest/jobs/{job_id}`` for status and results.

    * **type=demo** — loads built-in synthetic data (path ignored).
    * **type=file** — parses a single Sigma YAML file at *path*.
    * **type=directory** — recursively parses all YAML files under *path*.
    """
    _validate_path(req.path, req.type)

    async with state._lock:
        if state._ingesting:
            raise HTTPException(
                status_code=409,
                detail="An ingestion job is already running; wait for it to complete",
            )
        state._ingesting = True

    job_id = str(uuid.uuid4())
    corpus_id = str(uuid.uuid4()) if req.type != "demo" else "demo-corpus"

    job = IngestionJob(
        job_id=job_id,
        status=JobStatus.QUEUED,
        progress_stage="Queued",
        progress_pct=0,
    )
    await state.db.save_job(job)

    background_tasks.add_task(
        state.run_ingestion,
        path=req.path,
        ingest_type=req.type,
        corpus_id=corpus_id,
        job=job,
        is_demo=(req.type == "demo"),
    )

    return {"job_id": job_id, "corpus_id": corpus_id}


@router.get("/ingest/jobs/{job_id}", summary="Poll ingestion job status")
async def get_job(
    job_id: str,
    state: AnalysisState = Depends(get_state),
) -> dict:
    """Return the current status of an ingestion job."""
    job: IngestionJob | None = await state.db.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")
    return job.model_dump(mode="json")
