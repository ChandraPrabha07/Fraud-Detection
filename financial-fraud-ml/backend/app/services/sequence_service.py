"""HMM-based behavioural state inference for account-takeover detection."""
from __future__ import annotations

import secrets
from typing import Any

import numpy as np
from ml.sequence.generator import generate_account_sequence
from ml.sequence.inference import analyze_sequence

from app.schemas.sequence import SampleAccount, SequenceAnalysisResponse
from app.services.artifact_store import ArtifactStore


class SequenceService:
    def __init__(self, store: ArtifactStore) -> None:
        self.store = store

    def _model(self):
        return self.store.require(self.store.hmm_model, "HMM sequence model")

    def analyze(self, observations: list[str], account_id: str | None = None,
                true_states: list[str] | None = None, profile: str | None = None) -> SequenceAnalysisResponse:
        result = analyze_sequence(self._model(), observations)
        if true_states:
            for step, truth in zip(result["steps"], true_states):
                step["true_state"] = truth
        return SequenceAnalysisResponse(account_id=account_id, profile=profile, **result)

    def generate(self, profile: str, length: int, seed: int | None) -> SequenceAnalysisResponse:
        rng = np.random.default_rng(seed if seed is not None else secrets.randbits(32))
        account = generate_account_sequence(profile, length, rng)
        return self.analyze(account["observations"], account["account_id"], account["true_states"], profile)

    def samples(self) -> list[SampleAccount]:
        return [SampleAccount(**account) for account in self.store.hmm_samples]

    def model_summary(self) -> dict[str, Any]:
        return self.store.result("hmm")
