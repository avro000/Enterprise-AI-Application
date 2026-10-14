"""Audit Logging Service for Enterprise Compliance and Accountability."""

import logging
from typing import Any, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit_log import AuditLog

logger = logging.getLogger("audit_service")


class AuditService:
    """Records immutable audit trail entries across user, system, and AI operations."""

    @staticmethod
    async def log_event(
        db: AsyncSession,
        event_type: str,
        actor_type: str,  # 'user', 'system', 'ai'
        actor_id: Optional[Any] = None,
        entity_type: Optional[str] = None,  # 'document', 'exception', 'action', 'user', 'auth'
        entity_id: Optional[Any] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        """Appends an event to the audit log."""
        entry = AuditLog(
            event_type=event_type,
            actor_type=actor_type,
            actor_id=actor_id,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details or {},
        )
        db.add(entry)
        await db.commit()
        return entry
