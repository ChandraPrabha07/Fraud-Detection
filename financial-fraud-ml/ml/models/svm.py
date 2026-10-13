"""Support Vector Machine classifiers with linear and RBF kernels.

SVC training is roughly O(n^2), so the RBF model trains on a stratified
subsample of the SMOTE-balanced training data.
"""
from __future__ import annotations

import numpy as np
from sklearn.calibration import CalibratedClassifierCV
from sklearn.model_selection import GridSearchCV, StratifiedKFold
from sklearn.svm import SVC, LinearSVC

from ml.config import TrainingConfig
from ml.evaluation.reporting import Timer
from ml.evaluation.search_summary import summarize_search
from ml.preprocessing.sampling import stratified_subsample

LINEAR_GRID = {"C": [0.01, 0.1, 1.0]}
RBF_GRID = {"C": [1.0, 10.0], "gamma": ["scale", 0.01]}


def train_linear_svm(X: np.ndarray, y: np.ndarray, config: TrainingConfig):
    """Linear-kernel SVM (liblinear) with sigmoid calibration for probabilities."""
    cv = StratifiedKFold(n_splits=config.search_cv_folds, shuffle=True, random_state=config.random_state)
    base = LinearSVC(dual=False, max_iter=5000, random_state=config.random_state)
    search = GridSearchCV(base, LINEAR_GRID, scoring="average_precision", cv=cv, n_jobs=config.n_jobs)
    with Timer() as search_timer:
        search.fit(X, y)

    model = CalibratedClassifierCV(
        LinearSVC(dual=False, max_iter=5000, random_state=config.random_state, **search.best_params_),
        method="sigmoid",
        cv=3,
    )
    with Timer() as fit_timer:
        model.fit(X, y)
    summary = summarize_search(
        search, model_name="SVM (Linear kernel)",
        cv_description=f"StratifiedKFold(n_splits={config.search_cv_folds})", search_time_sec=search_timer.elapsed,
    )
    return model, summary, fit_timer.elapsed


def train_rbf_svm(X: np.ndarray, y: np.ndarray, config: TrainingConfig):
    X_search, y_search = stratified_subsample(X, y, config.svm_search_samples, config.random_state)
    cv = StratifiedKFold(n_splits=config.search_cv_folds, shuffle=True, random_state=config.random_state)
    search = GridSearchCV(SVC(kernel="rbf"), RBF_GRID, scoring="average_precision", cv=cv, n_jobs=config.n_jobs)
    with Timer() as search_timer:
        search.fit(X_search, y_search)

    X_fit, y_fit = stratified_subsample(X, y, config.svm_max_samples, config.random_state)
    model = SVC(kernel="rbf", probability=True, random_state=config.random_state, **search.best_params_)
    with Timer() as fit_timer:
        model.fit(X_fit, y_fit)
    summary = summarize_search(
        search, model_name="SVM (RBF kernel)",
        cv_description=f"StratifiedKFold(n_splits={config.search_cv_folds}) on {len(y_search)} samples",
        search_time_sec=search_timer.elapsed,
    )
    summary["training_samples"] = int(len(y_fit))
    return model, summary, fit_timer.elapsed
