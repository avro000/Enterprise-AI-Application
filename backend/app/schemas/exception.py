"""Operational Exception Schemas."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class ActionApproveRequest(BaseModel):
    comment: Optional[str] = None


class ActionRejectRequest(BaseModel):
    reason: str = Field(..., min_length=3, description="Justification required for rejecting an operational action")


class ExceptionAssignRequest(BaseModel):
    user_id: UUID = Field(..., description="ID of the user to assign ownership of this exception to")


class BatchActionApproveRequest(BaseModel):
    action_ids: List[UUID] = Field(..., min_length=1, description="List of action IDs to approve in bulk")
    comment: Optional[str] = None


class ExceptionActionResponse(BaseModel):
    id: UUID
    exception_id: UUID
    action_type: str
    description: str
    requires_approval: bool
    status: str
    approved_by: Optional[UUID] = None
    approver_name: Optional[str] = None
    approver_role: Optional[str] = None
    approver_designation: Optional[str] = None
    approver_display: Optional[str] = None
    approved_at: Optional[datetime] = None
    executed_at: Optional[datetime] = None
    result: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PendingActionItemResponse(BaseModel):
    """Enriched pending action item staged in the Action Center for governance review."""
    id: UUID
    exception_id: UUID
    case_number: str
    severity: str
    customer_name: Optional[str] = None
    order_number: Optional[str] = None
    action_type: str
    description: str
    requires_approval: bool
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ExceptionCaseResponse(BaseModel):
    id: UUID
    case_number: str
    exception_type: str
    severity: str
    status: str
    related_order_id: Optional[UUID] = None
    related_customer_id: Optional[UUID] = None
    assigned_to: Optional[UUID] = None
    investigation_summary: Optional[str] = None
    root_cause: Optional[str] = None
    business_impact: Optional[str] = None
    recommended_action: Optional[str] = None
    confidence_score: Optional[float] = None
    sources_used: Optional[List[Dict[str, Any]]] = None
    investigation_steps: Optional[List[Dict[str, Any]]] = None
    detected_at: datetime
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[UUID] = None
    resolver_name: Optional[str] = None
    resolver_designation: Optional[str] = None
    resolver_display: Optional[str] = None
    actions: Optional[List[ExceptionActionResponse]] = []

    model_config = ConfigDict(from_attributes=True)


class InvestigationResponse(BaseModel):
    status: str
    message: str
    case_number: str
    confidence_score: Optional[float] = None
    investigation_steps: Optional[List[Dict[str, Any]]] = None
    actions_count: int
    auto_executed_count: int
    pending_approval_count: int
