from typing import Any

from fastapi import APIRouter, Depends

from app.dependencies import get_bayesian_service
from app.schemas.bayesian import BayesianEvidence, BayesianInferenceResponse
from app.services.bayesian_service import BayesianService

router = APIRouter(prefix="/bayesian", tags=["bayesian"])


@router.get("/network")
def network_summary(service: BayesianService = Depends(get_bayesian_service)) -> dict[str, Any]:
    return service.summary()


@router.post("/infer", response_model=BayesianInferenceResponse)
def infer_fraud_probability(
    evidence: BayesianEvidence, service: BayesianService = Depends(get_bayesian_service)
) -> BayesianInferenceResponse:
    return service.infer(evidence.observed())
