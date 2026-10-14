"""AuditLog ORM Model."""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Index, JSON, String
from app.database import Base
from app.models.types import GUID


class AuditLog(Base):
    """Immutable audit trail recording all human and AI events for enterprise governance."""
    __tablename__ = "audit_log"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    event_type = Column(String(50), nullable=False, index=True)
    # 'document_uploaded', 'chat_query', 'exception_detected', 'recommendation_generated',
    # 'action_approved', 'action_rejected', 'otp_requested', 'password_reset'
    actor_type = Column(String(10), nullable=False)  # 'user', 'system', 'ai'
    actor_id = Column(GUID, nullable=True, index=True)
    entity_type = Column(String(30), nullable=True)  # 'document', 'exception', 'action', 'user'
    entity_id = Column(GUID, nullable=True)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    __table_args__ = (
        Index("idx_audit_log_entity", "entity_type", "entity_id"),
    )
