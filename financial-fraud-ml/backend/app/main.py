"""FastAPI application entry point.

Run from the backend/ directory:  uvicorn app.main:app --reload --port 8000
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings

settings = get_settings()  # also puts the project root on sys.path for `ml` imports

from app.routes import analysis, bayesian, dashboard, health, models, predict, sequence  # noqa: E402
from app.services.artifact_store import ArtifactNotAvailableError  # noqa: E402
from app.services.container import ServiceContainer  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s")
logger = logging.getLogger(__name__)


class _IgnoreClientResetFilter(logging.Filter):
    """Windows' proactor loop logs a traceback whenever a browser drops a keep-alive socket; it is harmless."""

    def filter(self, record: logging.LogRecord) -> bool:
        exc = record.exc_info[1] if record.exc_info else None
        return not isinstance(exc, ConnectionResetError)


logging.getLogger("asyncio").addFilter(_IgnoreClientResetFilter())


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load every model once; requests never trigger retraining.
    app.state.services = ServiceContainer.build(settings)
    for warning in app.state.services.store.load_errors:
        logger.warning(warning)
    yield


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="Fraud detection, dimensionality reduction, Bayesian risk and HMM sequence analysis.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.exception_handler(ArtifactNotAvailableError)
async def artifact_missing_handler(_: Request, exc: ArtifactNotAvailableError) -> JSONResponse:
    return JSONResponse(status_code=503, content={"detail": str(exc)})


@app.exception_handler(ValueError)
async def value_error_handler(_: Request, exc: ValueError) -> JSONResponse:
    return JSONResponse(status_code=422, content={"detail": str(exc)})


for router in (health.router, dashboard.router, models.router, predict.router, analysis.router,
               bayesian.router, sequence.router):
    app.include_router(router, prefix=settings.api_prefix)


if settings.static_dir:
    from app.frontend import mount_frontend  # noqa: E402

    mount_frontend(app, settings.static_dir, settings.api_prefix)
else:

    @app.get("/", include_in_schema=False)
    def root() -> dict[str, str]:
        return {"service": settings.app_name, "docs": "/docs", "health": f"{settings.api_prefix}/health"}
