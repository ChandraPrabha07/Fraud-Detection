from __future__ import annotations

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    models_loaded: list[str]
    results_loaded: list[str]
    bayesian_network_loaded: bool
    hmm_loaded: bool
    warnings: list[str]


class ErrorResponse(BaseModel):
    detail: str
