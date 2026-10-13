"""Training-only class rebalancing: random undersampling followed by SMOTE.

Only ever call this on the training partition; the test set keeps the
natural ~0.17% fraud rate so metrics reflect production conditions.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
from imblearn.over_sampling import SMOTE
from imblearn.under_sampling import RandomUnderSampler

from ml.config import TrainingConfig


def class_counts(y: np.ndarray) -> dict[str, int]:
    return {"legitimate": int((y == 0).sum()), "fraud": int((y == 1).sum())}


@dataclass
class ResampleResult:
    X: np.ndarray
    y: np.ndarray
    stages: list[dict] = field(default_factory=list)


def resample_training_data(X: np.ndarray, y: np.ndarray, config: TrainingConfig) -> ResampleResult:
    stages = [{"stage": "Original training set", **class_counts(y)}]

    if (y == 0).sum() > config.majority_cap:
        undersampler = RandomUnderSampler(
            sampling_strategy={0: config.majority_cap}, random_state=config.random_state
        )
        X, y = undersampler.fit_resample(X, y)
        stages.append({"stage": "After random undersampling", **class_counts(y)})

    smote = SMOTE(sampling_strategy=config.smote_ratio, k_neighbors=5, random_state=config.random_state)
    X, y = smote.fit_resample(X, y)
    stages.append({"stage": "After SMOTE", **class_counts(y)})
    return ResampleResult(X=X, y=y, stages=stages)
