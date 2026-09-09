"""Dashboard Metrics Schemas."""

from typing import Dict
from pydantic import BaseModel


class DashboardMetricsResponse(BaseModel):
    exceptions_detected_today: int
    exceptions_open: int
    exceptions_resolved_today: int
    exceptions_by_severity: Dict[str, int]
    documents_indexed: int
    total_chunks: int
    avg_resolution_minutes: int
    approval_rate: float
