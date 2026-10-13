"""Gradient boosting with XGBoost, tuned via RandomizedSearchCV."""
from __future__ import annotations

import numpy as np
from sklearn.model_selection import RandomizedSearchCV, StratifiedKFold
from xgboost import XGBClassifier

from ml.config import TrainingConfig
from ml.evaluation.reporting import Timer
from ml.evaluation.search_summary import summarize_search

PARAM_DISTRIBUTIONS = {
    "n_estimators": [200, 300, 400],
    "max_depth": [3, 4, 6, 8],
    "learning_rate": [0.03, 0.05, 0.1, 0.2],
    "subsample": [0.7, 0.85, 1.0],
    "colsample_bytree": [0.6, 0.8, 1.0],
    "min_child_weight": [1, 3, 5],
}


def build_xgboost(config: TrainingConfig, n_jobs: int = 1, **params) -> XGBClassifier:
    return XGBClassifier(
        objective="binary:logistic",
        eval_metric="aucpr",
        tree_method="hist",
        n_jobs=n_jobs,
        random_state=config.random_state,
        **params,
    )


def train_xgboost(X: np.ndarray, y: np.ndarray, config: TrainingConfig):
    cv = StratifiedKFold(n_splits=config.search_cv_folds, shuffle=True, random_state=config.random_state)
    # Parallelise across search candidates rather than inside each booster.
    search = RandomizedSearchCV(
        build_xgboost(config),
        PARAM_DISTRIBUTIONS,
        n_iter=config.random_search_iterations,
        scoring="average_precision",
        cv=cv,
        n_jobs=config.n_jobs,
        random_state=config.random_state,
        refit=False,
    )
    with Timer() as search_timer:
        search.fit(X, y)

    model = build_xgboost(config, n_jobs=config.n_jobs, **search.best_params_)
    with Timer() as fit_timer:
        model.fit(X, y)
    summary = summarize_search(
        search, model_name="XGBoost",
        cv_description=f"StratifiedKFold(n_splits={config.search_cv_folds})", search_time_sec=search_timer.elapsed,
    )
    return model, summary, fit_timer.elapsed
