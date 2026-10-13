from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Binary = Literal[0, 1]


class BayesianEvidence(BaseModel):
    """Omit a field (or send null) to leave that variable unobserved."""

    LocationMatch: Binary | None = Field(None, description="1 = transaction location matches the customer profile")
    DeviceKnown: Binary | None = Field(None, description="1 = device previously seen for this customer")
    LargeTransaction: Binary | None = Field(None, description="1 = amount is unusually large")
    UnusualTime: Binary | None = Field(None, description="1 = transaction at an atypical hour")

    def observed(self) -> dict[str, int]:
        return {k: v for k, v in self.model_dump().items() if v is not None}


class EvidenceContribution(BaseModel):
    variable: str
    value: int
    is_risk_signal: bool
    probability_without: float
    impact: float


class BayesianInferenceResponse(BaseModel):
    evidence: dict[str, int]
    fraud_probability: float
    prior_probability: float
    lift: float | None
    risk_level: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    contributions: list[EvidenceContribution]
