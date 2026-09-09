"""Exception Management Schemas."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel


class ActionApproveRequest(BaseModel):
    comment: Optional[str] = None


class ActionRejectRequest(BaseModel):
    reason: str


class ExceptionActionResponse(BaseModel):
    id: UUID
    exception_id: UUID
    action_type: str
    description: str
    status: str
    approved_by: Optional[UUID] = None
    approved_at: Optional[datetime] = None


class ExceptionCaseResponse(BaseModel):
    id: UUID
    case_number: str
    exception_type: str
    severity: str
    status: str
    related_order_id: Optional[UUID] = None
    related_customer_id: Optional[UUID] = None
    investigation_summary: Optional[str] = None
    root_cause: Optional[str] = None
    business_impact: Optional[str] = None
    recommended_action: Optional[str] = None
    confidence_score: Optional[float] = None
    sources_used: Optional[List[Dict[str, Any]]] = None
    detected_at: datetime
