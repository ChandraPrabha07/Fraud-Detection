"""Vocabulary and ground-truth dynamics for the synthetic behavioural HMM."""
from __future__ import annotations

import numpy as np

STATES = ["SAFE", "SUSPICIOUS", "COMPROMISED"]
OBSERVATIONS = [
    "Normal Login",
    "Small Purchase",
    "Large Purchase",
    "New Device",
    "New Location",
    "Failed Login",
]
STATE_INDEX = {s: i for i, s in enumerate(STATES)}
OBSERVATION_INDEX = {o: i for i, o in enumerate(OBSERVATIONS)}

# Rows: hidden state, columns: observation (same order as OBSERVATIONS).
TRUE_EMISSIONS = np.array(
    [
        [0.40, 0.42, 0.08, 0.03, 0.04, 0.03],  # SAFE
        [0.15, 0.15, 0.10, 0.20, 0.20, 0.20],  # SUSPICIOUS
        [0.05, 0.10, 0.40, 0.15, 0.15, 0.15],  # COMPROMISED
    ]
)

SEQUENCE_PROFILES = ["normal", "suspicious", "takeover"]
