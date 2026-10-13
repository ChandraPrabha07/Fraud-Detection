"""Synthetic risk-indicator dataset for the Bayesian belief network.

The Kaggle data has no semantic fields (device, location...), so these
variables are simulated with a known logistic fraud mechanism.
Encoding: 1 = condition true. LocationMatch=1 and DeviceKnown=1 are *safe*.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

EVIDENCE_VARIABLES = ["LocationMatch", "DeviceKnown", "LargeTransaction", "UnusualTime"]
TARGET_VARIABLE = "Fraud"

BASE_RATES = {"LocationMatch": 0.85, "DeviceKnown": 0.80, "LargeTransaction": 0.15, "UnusualTime": 0.20}


def generate_risk_dataset(n_samples: int = 20_000, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    data = {name: (rng.random(n_samples) < rate).astype(int) for name, rate in BASE_RATES.items()}

    location_mismatch = 1 - data["LocationMatch"]
    unknown_device = 1 - data["DeviceKnown"]
    logit = (
        -5.0
        + 2.0 * location_mismatch
        + 1.8 * unknown_device
        + 1.5 * data["LargeTransaction"]
        + 1.0 * data["UnusualTime"]
        + 0.8 * location_mismatch * unknown_device  # compounding risk
    )
    fraud_probability = 1.0 / (1.0 + np.exp(-logit))
    data[TARGET_VARIABLE] = (rng.random(n_samples) < fraud_probability).astype(int)
    return pd.DataFrame(data)
