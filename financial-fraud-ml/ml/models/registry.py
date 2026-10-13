"""Serialise trained models with joblib and keep a JSON registry the API reads.

Adding a new model = train it, then call ``registry.register(...)``. The
backend discovers it automatically from ``models/registry.json``.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import joblib

from ml.config import DECISION_THRESHOLD, FEATURE_COLUMNS, MODELS_DIR
from ml.evaluation.reporting import save_json

REGISTRY_FILENAME = "registry.json"


@dataclass
class RegistryEntry:
    key: str
    name: str
    family: str
    file: str
    task: str = "classification"
    description: str = ""


class ModelRegistry:
    def __init__(self, models_dir: Path = MODELS_DIR) -> None:
        self.models_dir = models_dir
        self.models_dir.mkdir(parents=True, exist_ok=True)
        self.entries: list[RegistryEntry] = []

    def register(self, key: str, name: str, family: str, estimator: Any, *, task: str = "classification",
                 description: str = "") -> None:
        filename = f"{key}.joblib"
        joblib.dump(estimator, self.models_dir / filename)
        self.entries = [e for e in self.entries if e.key != key]
        self.entries.append(RegistryEntry(key, name, family, filename, task, description))

    def save_artifact(self, filename: str, obj: Any) -> None:
        """Persist a non-registry artefact (e.g. Bayesian network, HMM)."""
        joblib.dump(obj, self.models_dir / filename)

    def write(self) -> None:
        save_json(
            {
                "feature_columns": FEATURE_COLUMNS,
                "decision_threshold": DECISION_THRESHOLD,
                "models": [asdict(e) for e in self.entries],
            },
            self.models_dir / REGISTRY_FILENAME,
        )
