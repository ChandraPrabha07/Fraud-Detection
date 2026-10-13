"""Loads trained models and result files once at startup and serves them from memory.

Models are never retrained here; run `python main.py train` to refresh artefacts.
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import joblib

from app.config import Settings

logger = logging.getLogger(__name__)

RESULT_FILES = {
    "dataset_summary": "dataset_summary.json",
    "model_metrics": "model_metrics.json",
    "dimensionality": "dimensionality.json",
    "imbalance": "imbalance.json",
    "regularization": "regularization.json",
    "hyperparameter_search": "hyperparameter_search.json",
    "svr": "svr.json",
    "risk_summary": "risk_summary.json",
    "sample_transactions": "sample_transactions.json",
    "bayesian": "bayesian.json",
    "hmm": "hmm.json",
}
BAYESIAN_MODEL_FILE = "bayesian_network.joblib"
HMM_MODEL_FILE = "hmm_sequence.joblib"
HMM_SAMPLES_FILE = "hmm_sample_accounts.json"


class ArtifactNotAvailableError(RuntimeError):
    """Raised when a requested model/result has not been produced by training yet."""


@dataclass
class LoadedModel:
    key: str
    name: str
    family: str
    task: str
    estimator: Any


@dataclass
class ArtifactStore:
    settings: Settings
    registry: dict[str, Any] = field(default_factory=dict)
    models: dict[str, LoadedModel] = field(default_factory=dict)
    results: dict[str, Any] = field(default_factory=dict)
    bayesian_model: Any = None
    hmm_model: Any = None
    hmm_samples: list[dict] = field(default_factory=list)
    load_errors: list[str] = field(default_factory=list)

    def load(self) -> None:
        self._load_registry_models()
        self._load_results()
        self.bayesian_model = self._load_joblib(self.settings.models_dir / BAYESIAN_MODEL_FILE)
        self.hmm_model = self._load_joblib(self.settings.models_dir / HMM_MODEL_FILE)
        samples = self._read_json(self.settings.synthetic_dir / HMM_SAMPLES_FILE)
        self.hmm_samples = samples.get("accounts", []) if samples else []
        logger.info("Loaded %d models, %d result files", len(self.models), len(self.results))

    # -- loading helpers -------------------------------------------------
    def _load_joblib(self, path: Path) -> Any:
        if not path.exists():
            self.load_errors.append(f"Missing model file: {path.name}")
            return None
        try:
            return joblib.load(path)
        except Exception as exc:  # corrupt / incompatible pickle should not crash the API
            self.load_errors.append(f"Failed to load {path.name}: {exc}")
            logger.exception("Failed to load %s", path)
            return None

    def _read_json(self, path: Path) -> Any:
        if not path.exists():
            return None
        with path.open(encoding="utf-8") as handle:
            return json.load(handle)

    @staticmethod
    def _single_threaded(estimator: Any) -> Any:
        """Training used n_jobs=-1; for single-row requests worker-pool start-up dominates latency."""
        if hasattr(estimator, "get_params"):
            params = {k: 1 for k in estimator.get_params(deep=True) if k == "n_jobs" or k.endswith("__n_jobs")}
            if params:
                estimator.set_params(**params)
        return estimator

    def _load_registry_models(self) -> None:
        self.registry = self._read_json(self.settings.models_dir / "registry.json") or {}
        for entry in self.registry.get("models", []):
            estimator = self._load_joblib(self.settings.models_dir / entry["file"])
            if estimator is not None:
                estimator = self._single_threaded(estimator)
                self.models[entry["key"]] = LoadedModel(
                    entry["key"], entry["name"], entry["family"], entry.get("task", "classification"), estimator
                )

    def _load_results(self) -> None:
        for key, filename in RESULT_FILES.items():
            data = self._read_json(self.settings.results_dir / filename)
            if data is None:
                self.load_errors.append(f"Missing result file: {filename}")
            else:
                self.results[key] = data

    # -- accessors ---------------------------------------------------------
    def result(self, key: str) -> Any:
        if key not in self.results:
            raise ArtifactNotAvailableError(
                f"Result '{key}' is not available. Run `python main.py train` to generate it."
            )
        return self.results[key]

    def classifiers(self) -> list[LoadedModel]:
        return [m for m in self.models.values() if m.task == "classification"]

    def model(self, key: str) -> LoadedModel | None:
        return self.models.get(key)

    @property
    def feature_columns(self) -> list[str]:
        return self.registry.get("feature_columns", [])

    @property
    def decision_threshold(self) -> float:
        return float(self.registry.get("decision_threshold", 0.5))

    def require(self, obj: Any, description: str) -> Any:
        if obj is None:
            raise ArtifactNotAvailableError(f"{description} is not trained. Run `python main.py train`.")
        return obj
