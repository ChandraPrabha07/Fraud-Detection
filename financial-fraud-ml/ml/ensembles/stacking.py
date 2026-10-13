"""Stacking ensemble: heterogeneous base learners + logistic meta-learner."""
from __future__ import annotations

import numpy as np
from sklearn.base import clone
from sklearn.ensemble import StackingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold

from ml.config import TrainingConfig
from ml.evaluation.reporting import Timer


def train_stacking(X: np.ndarray, y: np.ndarray, base_estimators: dict, config: TrainingConfig):
    """``base_estimators`` maps short names to already-tuned (fitted or unfitted) estimators."""
    estimators = [(name, clone(est)) for name, est in base_estimators.items()]
    model = StackingClassifier(
        estimators=estimators,
        final_estimator=LogisticRegression(max_iter=1000, random_state=config.random_state),
        stack_method="predict_proba",
        cv=StratifiedKFold(n_splits=config.search_cv_folds, shuffle=True, random_state=config.random_state),
        n_jobs=1,
    )
    with Timer() as timer:
        model.fit(X, y)
    params = {"base_estimators": list(base_estimators), "meta_learner": "LogisticRegression"}
    return model, params, timer.elapsed
