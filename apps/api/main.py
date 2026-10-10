"""BLIND FastAPI application entry point."""
import logging
from contextlib import asynccontextmanager
from typing import Callable

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from apps.api.routes import (
    coverage,
    export,
    gaps,
    health,
    ingest,
    rules,
    snapshots,
    techniques,
    telemetry,
    validation,
)
from apps.api.services.analysis import get_state

logger = logging.getLogger(__name__)

_MAX_BODY_BYTES = 10 * 1024 * 1024  # 10 MB


class _BodySizeLimitMiddleware(BaseHTTPMiddleware):
    """Reject requests whose Content-Length exceeds the configured limit."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        cl = request.headers.get("content-length")
        if cl:
            try:
                if int(cl) > _MAX_BODY_BYTES:
                    return JSONResponse(
                        {"detail": "Request body too large (max 10 MB)"},
                        status_code=413,
                    )
            except ValueError:
                pass
        return await call_next(request)


class _SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add defensive security headers to every response."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialise the singleton DB connection on startup
    await get_state()
    yield


app = FastAPI(
    title="BLIND API",
    version="0.1.0",
    description=(
        "BLIND — Detection Coverage Intelligence Platform. "
        "Maps Sigma rules to MITRE ATT&CK and surfaces coverage gaps."
    ),
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# CORS is added first so it is the outermost middleware and handles OPTIONS preflights
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5179",
        "http://127.0.0.1:5179",
        "http://localhost:5180",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(_BodySizeLimitMiddleware)
app.add_middleware(_SecurityHeadersMiddleware)

_PREFIX = "/api"

app.include_router(health.router, prefix=_PREFIX)
app.include_router(ingest.router, prefix=_PREFIX)
app.include_router(rules.router, prefix=_PREFIX)
app.include_router(techniques.router, prefix=_PREFIX)
app.include_router(coverage.router, prefix=_PREFIX)
app.include_router(gaps.router, prefix=_PREFIX)
app.include_router(telemetry.router, prefix=_PREFIX)
app.include_router(validation.router, prefix=_PREFIX)
app.include_router(snapshots.router, prefix=_PREFIX)
app.include_router(export.router, prefix=_PREFIX)
