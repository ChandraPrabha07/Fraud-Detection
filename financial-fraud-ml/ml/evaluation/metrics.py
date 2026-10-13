"""Imbalance-aware classification metrics and compact curve representations."""
from __future__ import annotations

from typing import Any

import numpy as np
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)

from ml.config import DECISION_THRESHOLD

CURVE_POINTS = 101


def compute_classification_metrics(
    y_true: np.ndarray, fraud_proba: np.ndarray, threshold: float = DECISION_THRESHOLD
) -> dict[str, Any]:
    y_pred = (fraud_proba >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
    return {
        "precision": precision_score(y_true, y_pred, zero_division=0),
        "recall": recall_score(y_true, y_pred, zero_division=0),
        "f1": f1_score(y_true, y_pred, zero_division=0),
        "roc_auc": roc_auc_score(y_true, fraud_proba),
        "pr_auc": average_precision_score(y_true, fraud_proba),
        # Reported for completeness only: misleading on a 0.17% positive rate.
        "accuracy": accuracy_score(y_true, y_pred),
        "confusion_matrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
    }


def roc_curve_points(y_true: np.ndarray, fraud_proba: np.ndarray) -> list[dict[str, float]]:
    fpr, tpr, _ = roc_curve(y_true, fraud_proba)
    grid = np.linspace(0, 1, CURVE_POINTS)
    tpr_interp = np.interp(grid, fpr, tpr)
    tpr_interp[0] = 0.0
    return [{"fpr": round(float(x), 4), "tpr": round(float(y), 4)} for x, y in zip(grid, tpr_interp)]


def pr_curve_points(y_true: np.ndarray, fraud_proba: np.ndarray) -> list[dict[str, float]]:
    precision, recall, _ = precision_recall_curve(y_true, fraud_proba)
    grid = np.linspace(0, 1, CURVE_POINTS)
    # Interpolated precision: best precision achievable at recall >= r.
    points = []
    for r in grid:
        mask = recall >= r
        best = float(precision[mask].max()) if mask.any() else 0.0
        points.append({"recall": round(float(r), 4), "precision": round(best, 4)})
    return points


def evaluate_classifier(
    model: Any,
    X_test: np.ndarray,
    y_test: np.ndarray,
    *,
    key: str,
    name: str,
    family: str,
    training_time_sec: float,
    best_params: dict[str, Any] | None = None,
) -> tuple[dict[str, Any], np.ndarray]:
    """Evaluate a fitted classifier; returns (report, fraud probabilities)."""
    fraud_proba = model.predict_proba(X_test)[:, 1]
    report = {
        "key": key,
        "name": name,
        "family": family,
        **compute_classification_metrics(y_test, fraud_proba),
        "training_time_sec": training_time_sec,
        "best_params": best_params or {},
        "roc_curve": roc_curve_points(y_test, fraud_proba),
        "pr_curve": pr_curve_points(y_test, fraud_proba),
    }
    return report, fraud_proba
