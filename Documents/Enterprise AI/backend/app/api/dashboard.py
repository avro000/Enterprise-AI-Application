"""Dashboard API Routes."""

from fastapi import APIRouter
from app.schemas.dashboard import DashboardMetricsResponse

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/metrics", response_model=DashboardMetricsResponse)
async def get_dashboard_metrics():
    """Retrieve operational dashboard metrics placeholder."""
    pass
