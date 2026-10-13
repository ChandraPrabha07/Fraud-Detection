"""Thin adapter around the shared Bayesian inference engine."""
from __future__ import annotations

from typing import Any

from ml.bayesian.inference import FraudRiskInference

from app.schemas.bayesian import BayesianInferenceResponse
from app.services.artifact_store import ArtifactStore


class BayesianService:
    def __init__(self, store: ArtifactStore) -> None:
        self.store = store
        self._inference: FraudRiskInference | None = None

    def _engine(self) -> FraudRiskInference:
        if self._inference is None:
            model = self.store.require(self.store.bayesian_model, "Bayesian network")
            self._inference = FraudRiskInference(model)
        return self._inference

    def infer(self, evidence: dict[str, int]) -> BayesianInferenceResponse:
        return BayesianInferenceResponse(**self._engine().explain(evidence))

    def summary(self) -> dict[str, Any]:
        return self.store.result("bayesian")
