"""Read-only endpoints exposing pre-computed training/evaluation results."""
from typing import Any

from fastapi import APIRouter, Depends

from app.dependencies import get_store
from app.services.artifact_store import ArtifactStore

router = APIRouter(prefix="/analysis", tags=["analysis"])


@router.get("/dimensionality")
def dimensionality(store: ArtifactStore = Depends(get_store)) -> dict[str, Any]:
    return store.result("dimensionality")


@router.get("/imbalance")
def imbalance(store: ArtifactStore = Depends(get_store)) -> dict[str, Any]:
    return store.result("imbalance")


@router.get("/regularization")
def regularization(store: ArtifactStore = Depends(get_store)) -> dict[str, Any]:
    return store.result("regularization")


@router.get("/hyperparameter-search")
def hyperparameter_search(store: ArtifactStore = Depends(get_store)) -> dict[str, Any]:
    return store.result("hyperparameter_search")


@router.get("/svr")
def svr_amount_model(store: ArtifactStore = Depends(get_store)) -> dict[str, Any]:
    return store.result("svr")
