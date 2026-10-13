"""Train, evaluate and summarise the Bayesian network for the dashboard."""
from __future__ import annotations

import itertools
from typing import Any

import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split

from ml.bayesian.data_generator import EVIDENCE_VARIABLES, TARGET_VARIABLE
from ml.bayesian.inference import FraudRiskInference, risk_level
from ml.bayesian.network import NETWORK_EDGES, build_and_fit_network

SCENARIOS = {
    "Typical purchase": {"LocationMatch": 1, "DeviceKnown": 1, "LargeTransaction": 0, "UnusualTime": 0},
    "Large purchase at home": {"LocationMatch": 1, "DeviceKnown": 1, "LargeTransaction": 1, "UnusualTime": 0},
    "Travelling customer": {"LocationMatch": 0, "DeviceKnown": 1, "LargeTransaction": 0, "UnusualTime": 0},
    "New phone, night-time": {"LocationMatch": 1, "DeviceKnown": 0, "LargeTransaction": 0, "UnusualTime": 1},
    "Unknown device + foreign location": {"LocationMatch": 0, "DeviceKnown": 0, "LargeTransaction": 0, "UnusualTime": 0},
    "All risk signals": {"LocationMatch": 0, "DeviceKnown": 0, "LargeTransaction": 1, "UnusualTime": 1},
}


def train_bayesian_network(data: pd.DataFrame, random_state: int = 42):
    train, test = train_test_split(data, test_size=0.25, stratify=data[TARGET_VARIABLE], random_state=random_state)
    model = build_and_fit_network(train)
    inference = FraudRiskInference(model)

    # Only 16 distinct evidence combinations exist, so cache their posteriors.
    combos = list(itertools.product([0, 1], repeat=len(EVIDENCE_VARIABLES)))
    posterior = {c: inference.fraud_probability(dict(zip(EVIDENCE_VARIABLES, c))) for c in combos}

    test_keys = list(test[EVIDENCE_VARIABLES].itertuples(index=False, name=None))
    test_scores = np.array([posterior[k] for k in test_keys])
    combo_counts = train.groupby(EVIDENCE_VARIABLES).size().to_dict()

    summary: dict[str, Any] = {
        "nodes": [*EVIDENCE_VARIABLES, TARGET_VARIABLE],
        "edges": [{"source": s, "target": t} for s, t in NETWORK_EDGES],
        "training_samples": int(len(train)),
        "prior_fraud_probability": inference.fraud_probability({}),
        "marginals": {v: float(train[v].mean()) for v in EVIDENCE_VARIABLES},
        "evaluation": {
            "roc_auc": float(roc_auc_score(test[TARGET_VARIABLE], test_scores)),
            "test_samples": int(len(test)),
            "observed_fraud_rate": float(test[TARGET_VARIABLE].mean()),
        },
        "conditional_table": [
            {
                **dict(zip(EVIDENCE_VARIABLES, combo)),
                "fraud_probability": posterior[combo],
                "risk_level": risk_level(posterior[combo]),
                "support": int(combo_counts.get(combo, 0)),
            }
            for combo in sorted(combos, key=lambda c: posterior[c])
        ],
        "scenarios": [
            {"name": name, "evidence": ev, "fraud_probability": inference.fraud_probability(ev),
             "risk_level": risk_level(inference.fraud_probability(ev))}
            for name, ev in SCENARIOS.items()
        ],
    }
    return model, summary
