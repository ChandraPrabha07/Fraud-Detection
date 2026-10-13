"""Categorical HMM for behavioural account-takeover detection (hmmlearn).

Parameters are first estimated by supervised counting from labelled synthetic
sequences (which anchors state 0/1/2 to SAFE/SUSPICIOUS/COMPROMISED), then
optionally refined with Baum-Welch; the refined model is kept only if it
decodes held-out sequences at least as accurately.
"""
from __future__ import annotations

import copy
import logging
from typing import Any

import numpy as np
from hmmlearn.hmm import CategoricalHMM
from sklearn.metrics import f1_score, precision_score, recall_score

from ml.sequence.constants import OBSERVATION_INDEX, OBSERVATIONS, STATE_INDEX, STATES
from ml.sequence.inference import TAKEOVER_THRESHOLD, analyze_sequence

logger = logging.getLogger(__name__)
SMOOTHING = 1.0


def _stack(sequences: list[dict]) -> tuple[np.ndarray, list[int]]:
    X = np.concatenate([[OBSERVATION_INDEX[o] for o in s["observations"]] for s in sequences]).reshape(-1, 1)
    return X, [len(s["observations"]) for s in sequences]


def _supervised_estimates(sequences: list[dict]) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    n_states, n_obs = len(STATES), len(OBSERVATIONS)
    start = np.full(n_states, SMOOTHING)
    trans = np.full((n_states, n_states), SMOOTHING)
    emit = np.full((n_states, n_obs), SMOOTHING)
    for seq in sequences:
        states = [STATE_INDEX[s] for s in seq["true_states"]]
        obs = [OBSERVATION_INDEX[o] for o in seq["observations"]]
        start[states[0]] += 1
        for a, b in zip(states, states[1:]):
            trans[a, b] += 1
        for s, o in zip(states, obs):
            emit[s, o] += 1
    return start / start.sum(), trans / trans.sum(axis=1, keepdims=True), emit / emit.sum(axis=1, keepdims=True)


def _evaluate(model: CategoricalHMM, sequences: list[dict]) -> dict[str, Any]:
    true_states, pred_states, true_takeover, pred_takeover = [], [], [], []
    for seq in sequences:
        result = analyze_sequence(model, seq["observations"])
        true_states += seq["true_states"]
        pred_states += [step["state"] for step in result["steps"]]
        true_takeover.append(int("COMPROMISED" in seq["true_states"]))
        pred_takeover.append(int(result["takeover_risk"] >= TAKEOVER_THRESHOLD))

    true_arr, pred_arr = np.array(true_states), np.array(pred_states)
    return {
        "state_accuracy": float((true_arr == pred_arr).mean()),
        "per_state_recall": {
            s: float((pred_arr[true_arr == s] == s).mean()) if (true_arr == s).any() else None for s in STATES
        },
        "takeover_detection": {
            "precision": float(precision_score(true_takeover, pred_takeover, zero_division=0)),
            "recall": float(recall_score(true_takeover, pred_takeover, zero_division=0)),
            "f1": float(f1_score(true_takeover, pred_takeover, zero_division=0)),
            "accounts": len(sequences),
            "true_takeovers": int(sum(true_takeover)),
        },
    }


def train_hmm(train_sequences: list[dict], test_sequences: list[dict], random_state: int = 42):
    start, trans, emit = _supervised_estimates(train_sequences)
    supervised = CategoricalHMM(n_components=len(STATES), n_features=len(OBSERVATIONS), init_params="",
                                params="ste", n_iter=25, random_state=random_state)
    supervised.startprob_, supervised.transmat_, supervised.emissionprob_ = start, trans, emit

    refined = copy.deepcopy(supervised)
    X, lengths = _stack(train_sequences)
    refined.fit(X, lengths)

    supervised_eval, refined_eval = _evaluate(supervised, test_sequences), _evaluate(refined, test_sequences)
    use_refined = refined_eval["state_accuracy"] >= supervised_eval["state_accuracy"]
    model, evaluation = (refined, refined_eval) if use_refined else (supervised, supervised_eval)
    logger.info("HMM: supervised acc=%.3f, Baum-Welch acc=%.3f -> using %s",
                supervised_eval["state_accuracy"], refined_eval["state_accuracy"],
                "Baum-Welch" if use_refined else "supervised")

    summary = {
        "states": STATES,
        "observations": OBSERVATIONS,
        "estimation": "supervised + Baum-Welch refinement" if use_refined else "supervised MLE",
        "training_sequences": len(train_sequences),
        "test_sequences": len(test_sequences),
        "start_probabilities": dict(zip(STATES, model.startprob_.tolist())),
        "transition_matrix": [
            {"from": s, **dict(zip(STATES, row.tolist()))} for s, row in zip(STATES, model.transmat_)
        ],
        "emission_matrix": [
            {"state": s, **dict(zip(OBSERVATIONS, row.tolist()))} for s, row in zip(STATES, model.emissionprob_)
        ],
        "evaluation": evaluation,
        "comparison": {"supervised": supervised_eval["state_accuracy"], "baum_welch": refined_eval["state_accuracy"]},
    }
    return model, summary
