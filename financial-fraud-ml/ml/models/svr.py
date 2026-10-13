"""Support Vector Regression for TRANSACTION AMOUNT prediction.

Predicts the expected ``Amount`` of a transaction from its anonymised V1-V28
features. This is transaction-value estimation, NOT financial-loss prediction.
"""
from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import GridSearchCV, KFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVR

from ml.config import PCA_FEATURES, TrainingConfig
from ml.evaluation.reporting import Timer
from ml.evaluation.search_summary import summarize_search

PARAM_GRID = {"svr__C": [1.0, 10.0], "svr__epsilon": [0.1, 0.3]}
SCATTER_POINTS = 300


def _sample(df: pd.DataFrame, n: int, seed: int) -> pd.DataFrame:
    return df.sample(n=min(n, len(df)), random_state=seed)


def train_amount_svr(train_raw: pd.DataFrame, test_raw: pd.DataFrame, config: TrainingConfig):
    train = _sample(train_raw, config.svr_max_samples, config.random_state)
    test = _sample(test_raw, config.svr_eval_samples, config.random_state)

    # Amounts are heavily right-skewed; regress on log1p and invert at prediction time.
    y_train_log = np.log1p(train["Amount"].to_numpy())
    pipeline = Pipeline([("scaler", StandardScaler()), ("svr", SVR(kernel="rbf"))])
    search = GridSearchCV(
        pipeline, PARAM_GRID, scoring="neg_mean_absolute_error",
        cv=KFold(n_splits=config.search_cv_folds, shuffle=True, random_state=config.random_state),
        n_jobs=config.n_jobs,
    )
    with Timer() as timer:
        search.fit(train[PCA_FEATURES], y_train_log)

    model = search.best_estimator_
    y_true = test["Amount"].to_numpy()
    y_pred = np.clip(np.expm1(model.predict(test[PCA_FEATURES])), 0, None)

    rng = np.random.default_rng(config.random_state)
    scatter_idx = rng.choice(len(y_true), size=min(SCATTER_POINTS, len(y_true)), replace=False)

    results: dict[str, Any] = {
        "label": "Transaction amount prediction (SVR) - not a financial-loss estimate",
        "target": "Amount",
        "features": PCA_FEATURES,
        "target_transform": "log1p",
        "training_samples": int(len(train)),
        "evaluation_samples": int(len(test)),
        "training_time_sec": timer.elapsed,
        "metrics": {
            "mae": float(mean_absolute_error(y_true, y_pred)),
            "median_absolute_error": float(np.median(np.abs(y_true - y_pred))),
            "rmse": float(np.sqrt(mean_squared_error(y_true, y_pred))),
            "r2": float(r2_score(y_true, y_pred)),
            "r2_log_scale": float(r2_score(np.log1p(y_true), np.log1p(y_pred))),
        },
        "search": summarize_search(
            search, model_name="SVR (RBF kernel)",
            cv_description=f"KFold(n_splits={config.search_cv_folds})", search_time_sec=timer.elapsed,
        ),
        "scatter": [
            {"actual": round(float(y_true[i]), 2), "predicted": round(float(y_pred[i]), 2)} for i in scatter_idx
        ],
    }
    return model, results
