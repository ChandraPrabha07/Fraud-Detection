"""FastAPI dependency providers."""
from __future__ import annotations

from fastapi import Request

from app.services.artifact_store import ArtifactStore
from app.services.bayesian_service import BayesianService
from app.services.container import ServiceContainer
from app.services.dashboard_service import DashboardService
from app.services.prediction_service import PredictionService
from app.services.sequence_service import SequenceService


def get_container(request: Request) -> ServiceContainer:
    return request.app.state.services


def get_store(request: Request) -> ArtifactStore:
    return get_container(request).store


def get_prediction_service(request: Request) -> PredictionService:
    return get_container(request).predictions


def get_dashboard_service(request: Request) -> DashboardService:
    return get_container(request).dashboard


def get_bayesian_service(request: Request) -> BayesianService:
    return get_container(request).bayesian


def get_sequence_service(request: Request) -> SequenceService:
    return get_container(request).sequence
