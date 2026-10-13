"""Stratified subsampling for algorithms with super-linear training cost (SVM/SVR)."""
from __future__ import annotations

import numpy as np
from sklearn.model_selection import train_test_split


def stratified_subsample(
    X: np.ndarray, y: np.ndarray, max_samples: int, random_state: int
) -> tuple[np.ndarray, np.ndarray]:
    if len(y) <= max_samples:
        return X, y
    X_sub, _, y_sub, _ = train_test_split(
        X, y, train_size=max_samples, stratify=y, random_state=random_state
    )
    return X_sub, y_sub
