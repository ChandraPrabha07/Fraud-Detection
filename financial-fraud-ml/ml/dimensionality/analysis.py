"""Compare PCA / SVD / LDA by training the same classifier on each reduced space.

Order per reduction: fit reducer on the (scaled) training split -> transform
train/test -> SMOTE on reduced training data only -> classifier -> test metrics.
"""
from __future__ import annotations

import logging
from typing import Any

import numpy as np
from sklearn.decomposition import PCA
from sklearn.linear_model import LogisticRegression

from ml.config import TrainingConfig
from ml.dimensionality.reducers import build_reducers
from ml.evaluation.metrics import compute_classification_metrics
from ml.evaluation.reporting import Timer
from ml.imbalance.resampling import resample_training_data
from ml.preprocessing.splitter import DataSplit

logger = logging.getLogger(__name__)

PROJECTION_LEGIT_SAMPLES = 1_500
HISTOGRAM_BINS = 40


def _fit_and_score(X_train, y_train, X_test, y_test, config: TrainingConfig) -> dict[str, Any]:
    resampled = resample_training_data(X_train, y_train, config)
    classifier = LogisticRegression(max_iter=2000, random_state=config.random_state)
    with Timer() as timer:
        classifier.fit(resampled.X, resampled.y)
    proba = classifier.predict_proba(X_test)[:, 1]
    metrics = compute_classification_metrics(y_test, proba)
    metrics.pop("confusion_matrix")
    return {**metrics, "training_time_sec": timer.elapsed}


def _explained_variance_rows(ratios: np.ndarray, prefix: str) -> list[dict[str, Any]]:
    cumulative = np.cumsum(ratios)
    return [
        {"component": f"{prefix}{i + 1}", "ratio": float(r), "cumulative": float(c)}
        for i, (r, c) in enumerate(zip(ratios, cumulative))
    ]


def _pca_projection(split: DataSplit, config: TrainingConfig) -> list[dict[str, Any]]:
    """2-D PCA view of test transactions: all fraud plus a sample of legitimate."""
    pca_2d = PCA(n_components=2, random_state=config.random_state).fit(split.X_train)
    rng = np.random.default_rng(config.random_state)
    fraud_idx = np.flatnonzero(split.y_test == 1)
    legit_idx = np.flatnonzero(split.y_test == 0)
    legit_idx = rng.choice(legit_idx, size=min(PROJECTION_LEGIT_SAMPLES, len(legit_idx)), replace=False)
    idx = np.concatenate([legit_idx, fraud_idx])
    coords = pca_2d.transform(split.X_test[idx])
    return [
        {"pc1": round(float(x), 4), "pc2": round(float(y), 4), "label": int(split.y_test[i])}
        for (x, y), i in zip(coords, idx)
    ]


def _lda_histogram(lda, split: DataSplit) -> list[dict[str, Any]]:
    projected = lda.transform(split.X_test).ravel()
    edges = np.histogram_bin_edges(projected, bins=HISTOGRAM_BINS)
    # Densities per class: raw counts would hide the tiny fraud class.
    legit, _ = np.histogram(projected[split.y_test == 0], bins=edges, density=True)
    fraud, _ = np.histogram(projected[split.y_test == 1], bins=edges, density=True)
    centers = (edges[:-1] + edges[1:]) / 2
    return [
        {"bin": round(float(c), 3), "legitimate": float(l), "fraud": float(f)}
        for c, l, f in zip(centers, legit, fraud)
    ]


def run_dimensionality_analysis(split: DataSplit, config: TrainingConfig) -> dict[str, Any]:
    n_classes = len(np.unique(split.y_train))
    n_features = split.X_train.shape[1]
    reducers = build_reducers(config.reduced_components, n_classes, n_features, config.random_state)

    methods = [
        {
            "method": "Baseline (all features)",
            "components": n_features,
            "explained_variance": 1.0,
            **_fit_and_score(split.X_train, split.y_train, split.X_test, split.y_test, config),
        }
    ]

    fitted = {}
    for name, reducer in reducers.items():
        logger.info("Dimensionality reduction: %s", name)
        with Timer() as reduce_timer:
            # LDA is supervised and needs labels; PCA/SVD ignore them.
            reducer.fit(split.X_train, split.y_train)
        fitted[name] = reducer
        X_train_reduced = reducer.transform(split.X_train)
        X_test_reduced = reducer.transform(split.X_test)
        explained = getattr(reducer, "explained_variance_ratio_", None)
        methods.append(
            {
                "method": name,
                "components": int(X_train_reduced.shape[1]),
                "explained_variance": float(np.sum(explained)) if explained is not None else None,
                "reduction_time_sec": reduce_timer.elapsed,
                **_fit_and_score(X_train_reduced, split.y_train, X_test_reduced, split.y_test, config),
            }
        )

    return {
        "classifier": "Logistic Regression (SMOTE on reduced training data)",
        "original_dimensions": n_features,
        "methods": methods,
        "pca_explained_variance": _explained_variance_rows(fitted["PCA"].explained_variance_ratio_, "PC"),
        "svd_explained_variance": _explained_variance_rows(fitted["SVD"].explained_variance_ratio_, "SV"),
        "pca_projection": _pca_projection(split, config),
        "lda_histogram": _lda_histogram(fitted["LDA"], split),
        "notes": {
            "lda": (
                f"LDA yields at most n_classes - 1 components. With {n_classes} classes "
                f"(fraud / legitimate) it produces {fitted['LDA'].n_components} discriminant axis."
            ),
            "pca": "Unsupervised; maximises retained variance.",
            "svd": "Truncated SVD on the scaled matrix; works without centering and on sparse data.",
        },
    }
