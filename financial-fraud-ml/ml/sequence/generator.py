"""Generate labelled synthetic account-activity sequences.

Profiles:
- normal:     SAFE with rare short SUSPICIOUS blips
- suspicious: frequent SUSPICIOUS episodes that recover (no compromise)
- takeover:   SAFE -> SUSPICIOUS build-up -> COMPROMISED until the end
"""
from __future__ import annotations

from typing import Any

import numpy as np

from ml.sequence.constants import OBSERVATIONS, SEQUENCE_PROFILES, STATES, TRUE_EMISSIONS

_PROFILE_TRANSITIONS = {
    "normal": np.array([[0.95, 0.05, 0.0], [0.6, 0.4, 0.0], [0.0, 0.0, 1.0]]),
    "suspicious": np.array([[0.80, 0.20, 0.0], [0.35, 0.65, 0.0], [0.0, 0.0, 1.0]]),
}


def _markov_path(transitions: np.ndarray, length: int, rng: np.random.Generator) -> list[int]:
    path = [0]
    for _ in range(length - 1):
        path.append(int(rng.choice(len(STATES), p=transitions[path[-1]])))
    return path


def _takeover_path(length: int, rng: np.random.Generator) -> list[int]:
    onset = int(rng.integers(max(2, length // 3), max(3, 2 * length // 3)))
    build_up = int(rng.integers(2, 5))
    compromised_from = min(length - 1, onset + build_up)
    return [0 if t < onset else 1 if t < compromised_from else 2 for t in range(length)]


def generate_state_path(profile: str, length: int, rng: np.random.Generator) -> list[int]:
    if profile not in SEQUENCE_PROFILES:
        raise ValueError(f"Unknown profile '{profile}'. Choose from {SEQUENCE_PROFILES}")
    if profile == "takeover":
        return _takeover_path(length, rng)
    return _markov_path(_PROFILE_TRANSITIONS[profile], length, rng)


def generate_account_sequence(
    profile: str, length: int, rng: np.random.Generator, account_id: str | None = None
) -> dict[str, Any]:
    states = generate_state_path(profile, length, rng)
    observations = [int(rng.choice(len(OBSERVATIONS), p=TRUE_EMISSIONS[s])) for s in states]
    return {
        "account_id": account_id or f"ACC-{rng.integers(100000, 999999)}",
        "profile": profile,
        "observations": [OBSERVATIONS[o] for o in observations],
        "true_states": [STATES[s] for s in states],
    }


def generate_sequence_corpus(
    n_accounts: int = 900, min_length: int = 20, max_length: int = 40, seed: int = 42
) -> list[dict[str, Any]]:
    rng = np.random.default_rng(seed)
    profiles = rng.choice(SEQUENCE_PROFILES, size=n_accounts, p=[0.5, 0.2, 0.3])
    return [
        generate_account_sequence(str(p), int(rng.integers(min_length, max_length + 1)), rng, f"ACC-{i:05d}")
        for i, p in enumerate(profiles)
    ]
