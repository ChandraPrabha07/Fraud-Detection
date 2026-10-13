"""Central paths and hyperparameters for the training pipeline."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

PROJECT_ROOT = Path(os.getenv("FRAUD_PROJECT_ROOT", Path(__file__).resolve().parent.parent))

DATA_DIR = PROJECT_ROOT / "data"
RAW_DATA_PATH = DATA_DIR / "raw" / "creditcard.csv"
PROCESSED_DIR = DATA_DIR / "processed"
SYNTHETIC_DIR = DATA_DIR / "synthetic"
MODELS_DIR = PROJECT_ROOT / "models"
RESULTS_DIR = PROJECT_ROOT / "results"
REPORTS_DIR = PROJECT_ROOT / "reports"

TARGET_COLUMN = "Class"
PCA_FEATURES = [f"V{i}" for i in range(1, 29)]
FEATURE_COLUMNS = ["Time", *PCA_FEATURES, "Amount"]

DECISION_THRESHOLD = 0.5


@dataclass(frozen=True)
class TrainingConfig:
    random_state: int = 42
    test_size: float = 0.2
    # Majority class is undersampled before SMOTE so SVM/stacking stay tractable.
    majority_cap: int = 30_000
    smote_ratio: float = 0.5
    svm_max_samples: int = 8_000
    svm_search_samples: int = 4_000
    svr_max_samples: int = 6_000
    svr_eval_samples: int = 10_000
    cv_folds: int = 5
    search_cv_folds: int = 3
    random_search_iterations: int = 12
    reduced_components: int = 10
    n_jobs: int = -1

    @classmethod
    def quick(cls) -> "TrainingConfig":
        """Smaller settings for a fast smoke-test run."""
        return cls(
            majority_cap=8_000,
            svm_max_samples=2_500,
            svm_search_samples=1_500,
            svr_max_samples=2_000,
            svr_eval_samples=4_000,
            cv_folds=3,
            random_search_iterations=4,
        )


def ensure_directories() -> None:
    for directory in (PROCESSED_DIR, SYNTHETIC_DIR, MODELS_DIR, RESULTS_DIR, REPORTS_DIR, RAW_DATA_PATH.parent):
        directory.mkdir(parents=True, exist_ok=True)
