"""Stratified train/test split followed by train-only scaling."""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

from ml.config import FEATURE_COLUMNS, TARGET_COLUMN, TrainingConfig


@dataclass
class DataSplit:
    X_train_raw: pd.DataFrame
    X_test_raw: pd.DataFrame
    X_train: np.ndarray
    X_test: np.ndarray
    y_train: np.ndarray
    y_test: np.ndarray
    scaler: StandardScaler
    feature_names: list[str]


def split_and_scale(df: pd.DataFrame, config: TrainingConfig) -> DataSplit:
    X = df[FEATURE_COLUMNS]
    y = df[TARGET_COLUMN].to_numpy()
    X_train_raw, X_test_raw, y_train, y_test = train_test_split(
        X, y, test_size=config.test_size, stratify=y, random_state=config.random_state
    )
    # Fit on training rows only so test statistics never leak into preprocessing.
    scaler = StandardScaler().fit(X_train_raw)
    return DataSplit(
        X_train_raw=X_train_raw,
        X_test_raw=X_test_raw,
        X_train=scaler.transform(X_train_raw),
        X_test=scaler.transform(X_test_raw),
        y_train=y_train,
        y_test=y_test,
        scaler=scaler,
        feature_names=list(FEATURE_COLUMNS),
    )
