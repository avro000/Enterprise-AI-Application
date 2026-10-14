"""Dashboard Metrics Schemas for Operations Command Center & Business Value Suite."""

from typing import Any, Dict, List, Optional
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


class CommandCenterResponse(BaseModel):
    """Module A: Operations Command Center aggregated executive intelligence."""
    metrics: DashboardMetricsResponse
    critical_exceptions: List[Dict[str, Any]]
    at_risk_orders: List[Dict[str, Any]]
    pending_actions_count: int
    top_operational_risks: List[Dict[str, Any]]
    ai_insights: List[str]


class ROIProjection(BaseModel):
    """Section 15: Illustrative ROI and labor value model."""
    annual_exception_volume: int
    avg_manual_handling_minutes: int
    loaded_labor_cost_per_minute: float
    current_annual_cost: float
    projected_labor_savings: float
    projected_net_roi_multiple: str


class BusinessValueMetricsResponse(BaseModel):
    """Module G: Business Value Dashboard proving operational ROI and labor savings."""
    total_cases_detected: int
    cases_ai_assisted: int
    automated_actions_executed: int
    human_approvals_routed: int
    human_approvals_completed: int
    hours_saved: float
    labor_value_saved: float
    sla_breaches_avoided: int
    revenue_protected: float
    avg_resolution_minutes: int
    baseline_manual_minutes: int
    efficiency_improvement_pct: float
    roi_model: ROIProjection
