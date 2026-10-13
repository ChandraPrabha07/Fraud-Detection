"""Bagging-family ensembles: Random Forest and a bagged decision tree."""
from __future__ import annotations

import numpy as np
from sklearn.ensemble import BaggingClassifier, RandomForestClassifier
from sklearn.tree import DecisionTreeClassifier

from ml.config import TrainingConfig
from ml.evaluation.reporting import Timer

RANDOM_FOREST_PARAMS = {"n_estimators": 200, "max_depth": 16, "min_samples_leaf": 2, "max_features": "sqrt"}
BAGGING_PARAMS = {"n_estimators": 60, "max_samples": 0.8}


def build_random_forest(config: TrainingConfig) -> RandomForestClassifier:
    return RandomForestClassifier(**RANDOM_FOREST_PARAMS, n_jobs=config.n_jobs, random_state=config.random_state)


def train_random_forest(X: np.ndarray, y: np.ndarray, config: TrainingConfig):
    model = build_random_forest(config)
    with Timer() as timer:
        model.fit(X, y)
    return model, RANDOM_FOREST_PARAMS, timer.elapsed


def train_bagging(X: np.ndarray, y: np.ndarray, config: TrainingConfig):
    model = BaggingClassifier(
        estimator=DecisionTreeClassifier(min_samples_leaf=2, random_state=config.random_state),
        **BAGGING_PARAMS,
        n_jobs=config.n_jobs,
        random_state=config.random_state,
    )
    with Timer() as timer:
        model.fit(X, y)
    return model, BAGGING_PARAMS, timer.elapsed
