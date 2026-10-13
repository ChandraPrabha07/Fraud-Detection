from typing import Any

from fastapi import APIRouter, Depends

from app.dependencies import get_dashboard_service
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
def dashboard_summary(service: DashboardService = Depends(get_dashboard_service)) -> dict[str, Any]:
    return service.summary()
