"""Score a raw transaction with every registered classifier (+ SVR amount check)."""
from __future__ import annotations

from collections import deque
from datetime import datetime, timezone

import numpy as np
import pandas as pd

from app.schemas.transaction import (
    AmountAnalysis,
    EnsembleVerdict,
    ModelPrediction,
    PredictionResponse,
    RecentPrediction,
)
from app.services.artifact_store import ArtifactNotAvailableError, ArtifactStore
from app.services.risk import risk_level_for

PRIMARY_MODEL_KEY = "stacking"
SVR_MODEL_KEY = "svr_amount"
SVR_LABEL = "Expected transaction amount (SVR) - not a financial-loss estimate"


class PredictionService:
    def __init__(self, store: ArtifactStore, history_limit: int) -> None:
        self.store = store
        self.recent: deque[RecentPrediction] = deque(maxlen=history_limit)

    def predict(self, features: dict[str, float]) -> PredictionResponse:
        classifiers = self.store.classifiers()
        if not classifiers:
            raise ArtifactNotAvailableError("No trained classifiers found. Run `python main.py train`.")

        frame = pd.DataFrame([features], columns=self.store.feature_columns)
        threshold = self.store.decision_threshold
        predictions = []
        for model in classifiers:
            probability = float(model.estimator.predict_proba(frame)[0, 1])
            predictions.append(
                ModelPrediction(
                    key=model.key, name=model.name, family=model.family, fraud_probability=probability,
                    prediction="FRAUD" if probability >= threshold else "LEGITIMATE",
                )
            )

        primary = next((p for p in predictions if p.key == PRIMARY_MODEL_KEY), None)
        if primary:
            source, probability = primary.name, primary.fraud_probability
        else:
            source, probability = "Mean of all models", float(np.mean([p.fraud_probability for p in predictions]))

        verdict = EnsembleVerdict(
            source=source,
            fraud_probability=probability,
            prediction="FRAUD" if probability >= threshold else "LEGITIMATE",
            risk_level=risk_level_for(probability),
            models_flagging_fraud=sum(p.prediction == "FRAUD" for p in predictions),
            models_total=len(predictions),
        )
        self.recent.appendleft(
            RecentPrediction(
                timestamp=datetime.now(timezone.utc), amount=features["Amount"],
                fraud_probability=probability, risk_level=verdict.risk_level, prediction=verdict.prediction,
            )
        )
        return PredictionResponse(
            threshold=threshold, verdict=verdict, models=predictions, amount_analysis=self._amount_analysis(features)
        )

    def _amount_analysis(self, features: dict[str, float]) -> AmountAnalysis | None:
        svr = self.store.model(SVR_MODEL_KEY)
        if svr is None:
            return None
        feature_names = list(svr.estimator.feature_names_in_)
        log_prediction = svr.estimator.predict(pd.DataFrame([features])[feature_names])[0]
        expected = float(max(np.expm1(log_prediction), 0.0))
        entered = features["Amount"]
        return AmountAnalysis(
            label=SVR_LABEL,
            entered_amount=entered,
            expected_amount=expected,
            deviation_ratio=(entered / expected) if expected > 0.01 else None,
        )

    def recent_predictions(self) -> list[RecentPrediction]:
        return list(self.recent)
