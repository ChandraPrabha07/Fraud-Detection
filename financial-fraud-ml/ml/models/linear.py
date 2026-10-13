"""Logistic regression with L1/L2 regularisation and GridSearchCV tuning."""
from __future__ import annotations

from typing import Any

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GridSearchCV, StratifiedKFold

from ml.config import TrainingConfig
from ml.evaluation.metrics import compute_classification_metrics
from ml.evaluation.reporting import Timer
from ml.evaluation.search_summary import summarize_search

PARAM_GRID = {"C": [0.001, 0.01, 0.1, 1.0, 10.0], "penalty": ["l1", "l2"]}
REGULARIZATION_PATH_C = [0.0005, 0.001, 0.005, 0.01, 0.05, 0.1, 1.0, 10.0]


def _logistic(penalty: str, C: float, random_state: int) -> LogisticRegression:
    # saga supports L1 and L2; liblinear's L1 solver can stall on near-separable SMOTE data at large C.
    return LogisticRegression(penalty=penalty, C=C, solver="saga", tol=1e-3, max_iter=1000, random_state=random_state)


def tune_logistic_regression(X: np.ndarray, y: np.ndarray, config: TrainingConfig):
    cv = StratifiedKFold(n_splits=config.cv_folds, shuffle=True, random_state=config.random_state)
    search = GridSearchCV(
        _logistic("l2", 1.0, config.random_state),
        PARAM_GRID,
        scoring="average_precision",
        cv=cv,
        n_jobs=config.n_jobs,
    )
    with Timer() as timer:
        search.fit(X, y)
    summary = summarize_search(
        search,
        model_name="Logistic Regression",
        cv_description=f"StratifiedKFold(n_splits={config.cv_folds})",
        search_time_sec=timer.elapsed,
    )
    # Report the final refit time so it is comparable with the other models' fit times.
    return search.best_estimator_, summary, round(search.refit_time_, 3)


def compare_regularization(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_test: np.ndarray,
    y_test: np.ndarray,
    feature_names: list[str],
    best_C: float,
    config: TrainingConfig,
) -> dict[str, Any]:
    comparison, coefficients = [], {}
    for penalty in ("l1", "l2"):
        model = _logistic(penalty, best_C, config.random_state)
        with Timer() as timer:
            model.fit(X_train, y_train)
        metrics = compute_classification_metrics(y_test, model.predict_proba(X_test)[:, 1])
        coef = model.coef_.ravel()
        coefficients[penalty] = coef
        comparison.append(
            {
                "penalty": penalty.upper(),
                **metrics,
                "non_zero_coefficients": int(np.count_nonzero(np.abs(coef) > 1e-8)),
                "total_coefficients": int(coef.size),
                "l1_norm": float(np.abs(coef).sum()),
                "l2_norm": float(np.sqrt((coef**2).sum())),
                "training_time_sec": timer.elapsed,
            }
        )

    # Sparsity across C: L1 drives coefficients to exactly zero, L2 only shrinks them.
    path = []
    for C in REGULARIZATION_PATH_C:
        row: dict[str, Any] = {"C": C}
        for penalty in ("l1", "l2"):
            coef = _logistic(penalty, C, config.random_state).fit(X_train, y_train).coef_.ravel()
            row[f"{penalty}_non_zero"] = int(np.count_nonzero(np.abs(coef) > 1e-8))
        path.append(row)

    return {
        "C": best_C,
        "comparison": comparison,
        "coefficients": [
            {"feature": f, "l1": float(a), "l2": float(b)}
            for f, a, b in zip(feature_names, coefficients["l1"], coefficients["l2"])
        ],
        "sparsity_path": path,
    }
