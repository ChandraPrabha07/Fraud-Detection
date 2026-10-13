"""Conditional fraud probability queries: P(Fraud | Evidence)."""
from __future__ import annotations

from typing import Any

from pgmpy.inference import VariableElimination

from ml.bayesian.data_generator import EVIDENCE_VARIABLES, TARGET_VARIABLE

RISK_LEVELS = [(0.10, "LOW"), (0.30, "MEDIUM"), (0.60, "HIGH"), (1.01, "CRITICAL")]
# Value of each variable that indicates elevated risk.
RISKY_VALUE = {"LocationMatch": 0, "DeviceKnown": 0, "LargeTransaction": 1, "UnusualTime": 1}


def risk_level(probability: float) -> str:
    return next(label for limit, label in RISK_LEVELS if probability < limit)


class FraudRiskInference:
    def __init__(self, model) -> None:
        self.model = model
        self._engine = VariableElimination(model)

    def fraud_probability(self, evidence: dict[str, int]) -> float:
        unknown = set(evidence) - set(EVIDENCE_VARIABLES)
        if unknown:
            raise ValueError(f"Unknown evidence variables: {sorted(unknown)}")
        result = self._engine.query([TARGET_VARIABLE], evidence=evidence or None, show_progress=False)
        return float(result.get_value(**{TARGET_VARIABLE: 1}))

    def explain(self, evidence: dict[str, int]) -> dict[str, Any]:
        probability = self.fraud_probability(evidence)
        prior = self.fraud_probability({})
        contributions = []
        # Leave-one-out: how much does each observed variable move the posterior?
        for variable, value in evidence.items():
            without = {k: v for k, v in evidence.items() if k != variable}
            contributions.append(
                {
                    "variable": variable,
                    "value": value,
                    "is_risk_signal": value == RISKY_VALUE[variable],
                    "probability_without": self.fraud_probability(without),
                    "impact": probability - self.fraud_probability(without),
                }
            )
        return {
            "evidence": evidence,
            "fraud_probability": probability,
            "prior_probability": prior,
            "lift": probability / prior if prior else None,
            "risk_level": risk_level(probability),
            "contributions": contributions,
        }
