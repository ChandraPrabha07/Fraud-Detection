"""Aggregates training results into the dashboard overview payload."""
from __future__ import annotations

from typing import Any

from app.services.artifact_store import ArtifactStore
from app.services.prediction_service import PredictionService

COMPARISON_FIELDS = ("key", "name", "family", "precision", "recall", "f1", "roc_auc", "pr_auc")


class DashboardService:
    def __init__(self, store: ArtifactStore, predictions: PredictionService) -> None:
        self.store = store
        self.predictions = predictions

    def summary(self) -> dict[str, Any]:
        dataset = self.store.result("dataset_summary")
        metrics = self.store.result("model_metrics")
        return {
            "dataset": dataset,
            "best_model": metrics["best_model"],
            "model_comparison": [{k: m[k] for k in COMPARISON_FIELDS} for m in metrics["models"]],
            "risk_summary": self.store.results.get("risk_summary"),
            "recent_predictions": [p.model_dump(mode="json") for p in self.predictions.recent_predictions()],
        }
