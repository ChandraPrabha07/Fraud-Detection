from typing import Any

from fastapi import APIRouter, Depends

from app.dependencies import get_sequence_service
from app.schemas.sequence import (
    SampleAccount,
    SequenceAnalysisResponse,
    SequenceAnalyzeRequest,
    SequenceGenerateRequest,
)
from app.services.sequence_service import SequenceService

router = APIRouter(prefix="/sequence", tags=["sequence"])


@router.get("/model")
def hmm_model_summary(service: SequenceService = Depends(get_sequence_service)) -> dict[str, Any]:
    return service.model_summary()


@router.get("/samples", response_model=list[SampleAccount])
def sample_accounts(service: SequenceService = Depends(get_sequence_service)) -> list[SampleAccount]:
    return service.samples()


@router.post("/analyze", response_model=SequenceAnalysisResponse)
def analyze_sequence(
    request: SequenceAnalyzeRequest, service: SequenceService = Depends(get_sequence_service)
) -> SequenceAnalysisResponse:
    return service.analyze(list(request.observations), request.account_id)


@router.post("/generate", response_model=SequenceAnalysisResponse)
def generate_sequence(
    request: SequenceGenerateRequest, service: SequenceService = Depends(get_sequence_service)
) -> SequenceAnalysisResponse:
    return service.generate(request.profile, request.length, request.seed)
