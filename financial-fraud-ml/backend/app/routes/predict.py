from typing import Any

from fastapi import APIRouter, Depends

from app.dependencies import get_prediction_service, get_store
from app.schemas.transaction import PredictionResponse, RecentPrediction, TransactionRequest
from app.services.artifact_store import ArtifactStore
from app.services.prediction_service import PredictionService

router = APIRouter(prefix="/predict", tags=["prediction"])


@router.post("", response_model=PredictionResponse)
def predict_transaction(
    request: TransactionRequest, service: PredictionService = Depends(get_prediction_service)
) -> PredictionResponse:
    return service.predict(request.features)


@router.get("/samples")
def sample_transactions(store: ArtifactStore = Depends(get_store)) -> dict[str, Any]:
    return store.result("sample_transactions")


@router.get("/recent", response_model=list[RecentPrediction])
def recent_predictions(service: PredictionService = Depends(get_prediction_service)) -> list[RecentPrediction]:
    return service.recent_predictions()
