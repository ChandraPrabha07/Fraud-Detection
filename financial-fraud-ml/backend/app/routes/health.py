from fastapi import APIRouter, Depends

from app.dependencies import get_store
from app.schemas.common import HealthResponse
from app.services.artifact_store import ArtifactStore

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health(store: ArtifactStore = Depends(get_store)) -> HealthResponse:
    ready = bool(store.models) and store.bayesian_model is not None and store.hmm_model is not None
    return HealthResponse(
        status="ok" if ready else "degraded",
        models_loaded=sorted(store.models),
        results_loaded=sorted(store.results),
        bayesian_network_loaded=store.bayesian_model is not None,
        hmm_loaded=store.hmm_model is not None,
        warnings=store.load_errors,
    )
