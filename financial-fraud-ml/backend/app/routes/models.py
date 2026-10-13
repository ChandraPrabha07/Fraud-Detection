from typing import Any

from fastapi import APIRouter, Depends

from app.dependencies import get_store
from app.services.artifact_store import ArtifactStore

router = APIRouter(prefix="/models", tags=["models"])


@router.get("")
def list_models(store: ArtifactStore = Depends(get_store)) -> list[dict[str, Any]]:
    return [
        {"key": m.key, "name": m.name, "family": m.family, "task": m.task} for m in store.models.values()
    ]


@router.get("/metrics")
def model_metrics(store: ArtifactStore = Depends(get_store)) -> dict[str, Any]:
    return store.result("model_metrics")
