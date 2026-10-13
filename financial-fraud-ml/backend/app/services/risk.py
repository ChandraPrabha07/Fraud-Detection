"""Shared mapping from fraud probability to a risk label."""
from __future__ import annotations

RISK_THRESHOLDS = [(0.10, "LOW"), (0.30, "MEDIUM"), (0.60, "HIGH")]


def risk_level_for(probability: float) -> str:
    for limit, label in RISK_THRESHOLDS:
        if probability < limit:
            return label
    return "CRITICAL"
