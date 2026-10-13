from __future__ import annotations

import math
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

REQUIRED_FEATURES = ["Time", *[f"V{i}" for i in range(1, 29)], "Amount"]
RiskLevel = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]


class TransactionRequest(BaseModel):
    features: dict[str, float] = Field(
        ..., description="Raw transaction features: Time, V1..V28 and Amount (unscaled, as in creditcard.csv)."
    )

    @field_validator("features")
    @classmethod
    def validate_features(cls, features: dict[str, float]) -> dict[str, float]:
        missing = [f for f in REQUIRED_FEATURES if f not in features]
        if missing:
            raise ValueError(f"Missing features: {', '.join(missing)}")
        unknown = sorted(set(features) - set(REQUIRED_FEATURES))
        if unknown:
            raise ValueError(f"Unknown features: {', '.join(unknown)}")
        non_finite = [k for k, v in features.items() if not math.isfinite(v)]
        if non_finite:
            raise ValueError(f"Features must be finite numbers: {', '.join(non_finite)}")
        if features["Amount"] < 0:
            raise ValueError("Amount must be non-negative")
        if features["Time"] < 0:
            raise ValueError("Time must be non-negative")
        return features


class ModelPrediction(BaseModel):
    key: str
    name: str
    family: str
    fraud_probability: float
    prediction: Literal["FRAUD", "LEGITIMATE"]


class EnsembleVerdict(BaseModel):
    source: str
    fraud_probability: float
    prediction: Literal["FRAUD", "LEGITIMATE"]
    risk_level: RiskLevel
    models_flagging_fraud: int
    models_total: int


class AmountAnalysis(BaseModel):
    label: str
    entered_amount: float
    expected_amount: float
    deviation_ratio: float | None


class PredictionResponse(BaseModel):
    threshold: float
    verdict: EnsembleVerdict
    models: list[ModelPrediction]
    amount_analysis: AmountAnalysis | None


class RecentPrediction(BaseModel):
    timestamp: datetime
    amount: float
    fraud_probability: float
    risk_level: RiskLevel
    prediction: Literal["FRAUD", "LEGITIMATE"]
