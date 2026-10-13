"""Decode behavioural states for one account and score account-takeover risk."""
from __future__ import annotations

from typing import Any

import numpy as np

from ml.sequence.constants import OBSERVATION_INDEX, STATES

COMPROMISED = STATES.index("COMPROMISED")
RECENT_WINDOW = 3
TAKEOVER_THRESHOLD = 0.5


def encode_observations(observations: list[str]) -> np.ndarray:
    unknown = [o for o in observations if o not in OBSERVATION_INDEX]
    if unknown:
        raise ValueError(f"Unknown observations: {sorted(set(unknown))}")
    return np.array([OBSERVATION_INDEX[o] for o in observations]).reshape(-1, 1)


def _risk_level(score: float) -> str:
    if score >= 0.7:
        return "CRITICAL"
    if score >= TAKEOVER_THRESHOLD:
        return "HIGH"
    if score >= 0.2:
        return "MEDIUM"
    return "LOW"


def analyze_sequence(model, observations: list[str]) -> dict[str, Any]:
    if not observations:
        raise ValueError("Observation sequence must not be empty")
    encoded = encode_observations(observations)
    log_likelihood, viterbi_states = model.decode(encoded, algorithm="viterbi")
    posteriors = model.predict_proba(encoded)

    current_state = int(viterbi_states[-1])
    # Averaging the last few steps stops a single odd event from flipping the alert.
    recent = posteriors[-RECENT_WINDOW:, COMPROMISED]
    takeover_risk = float(max(recent.mean(), posteriors[-1, COMPROMISED]))

    first_compromised = next((i for i, s in enumerate(viterbi_states) if s == COMPROMISED), None)
    return {
        "steps": [
            {
                "step": i + 1,
                "observation": obs,
                "state": STATES[int(state)],
                "probabilities": {name: float(posteriors[i, j]) for j, name in enumerate(STATES)},
            }
            for i, (obs, state) in enumerate(zip(observations, viterbi_states))
        ],
        "current_state": STATES[current_state],
        "current_state_confidence": float(posteriors[-1, current_state]),
        "takeover_risk": takeover_risk,
        "takeover_detected": takeover_risk >= TAKEOVER_THRESHOLD,
        "risk_level": _risk_level(takeover_risk),
        "first_compromised_step": None if first_compromised is None else first_compromised + 1,
        "log_likelihood": float(log_likelihood),
    }
