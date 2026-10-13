"""Summaries of GridSearchCV / RandomizedSearchCV runs for the dashboard."""
from __future__ import annotations

from typing import Any

import numpy as np
from sklearn.model_selection._search import BaseSearchCV


def _clean_params(params: dict[str, Any]) -> dict[str, Any]:
    cleaned = {}
    for key, value in params.items():
        if isinstance(value, (np.integer, np.floating)):
            value = value.item()
        cleaned[key.split("__")[-1]] = value
    return cleaned


def summarize_search(
    search: BaseSearchCV, *, model_name: str, cv_description: str, search_time_sec: float, top_k: int = 5
) -> dict[str, Any]:
    results = search.cv_results_
    order = np.argsort(results["rank_test_score"])[:top_k]
    return {
        "model": model_name,
        "search_type": type(search).__name__,
        "cv": cv_description,
        "scoring": search.scoring if isinstance(search.scoring, str) else "custom",
        "best_params": _clean_params(search.best_params_),
        "best_score": float(search.best_score_),
        "n_candidates": int(len(results["params"])),
        "search_time_sec": search_time_sec,
        "top_candidates": [
            {
                "rank": int(results["rank_test_score"][i]),
                "params": _clean_params(results["params"][i]),
                "mean_score": float(results["mean_test_score"][i]),
                "std_score": float(results["std_test_score"][i]),
            }
            for i in order
        ],
    }
