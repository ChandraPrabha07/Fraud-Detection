from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Observation = Literal[
    "Normal Login", "Small Purchase", "Large Purchase", "New Device", "New Location", "Failed Login"
]
HiddenState = Literal["SAFE", "SUSPICIOUS", "COMPROMISED"]
Profile = Literal["normal", "suspicious", "takeover"]

MAX_SEQUENCE_LENGTH = 200


class SequenceAnalyzeRequest(BaseModel):
    observations: list[Observation] = Field(..., min_length=1, max_length=MAX_SEQUENCE_LENGTH)
    account_id: str | None = Field(None, max_length=64)


class SequenceGenerateRequest(BaseModel):
    profile: Profile = "takeover"
    length: int = Field(25, ge=5, le=60)
    seed: int | None = Field(None, ge=0, le=2**31 - 1)


class SequenceStep(BaseModel):
    step: int
    observation: Observation
    state: HiddenState
    true_state: HiddenState | None = None
    probabilities: dict[str, float]


class SequenceAnalysisResponse(BaseModel):
    account_id: str | None
    profile: str | None = None
    steps: list[SequenceStep]
    current_state: HiddenState
    current_state_confidence: float
    takeover_risk: float
    takeover_detected: bool
    risk_level: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    first_compromised_step: int | None
    log_likelihood: float


class SampleAccount(BaseModel):
    account_id: str
    profile: str
    observations: list[Observation]
    true_states: list[HiddenState]
