"""Builds all services once at startup so routes can share loaded artefacts."""
from __future__ import annotations

from dataclasses import dataclass

from app.config import Settings
from app.services.artifact_store import ArtifactStore
from app.services.bayesian_service import BayesianService
from app.services.dashboard_service import DashboardService
from app.services.prediction_service import PredictionService
from app.services.sequence_service import SequenceService


@dataclass
class ServiceContainer:
    store: ArtifactStore
    predictions: PredictionService
    dashboard: DashboardService
    bayesian: BayesianService
    sequence: SequenceService

    @classmethod
    def build(cls, settings: Settings) -> "ServiceContainer":
        store = ArtifactStore(settings)
        store.load()
        predictions = PredictionService(store, settings.recent_predictions_limit)
        return cls(
            store=store,
            predictions=predictions,
            dashboard=DashboardService(store, predictions),
            bayesian=BayesianService(store),
            sequence=SequenceService(store),
        )
