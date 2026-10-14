"""ExceptionCase ORM Model."""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Float, ForeignKey, JSON, String, Text
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.types import GUID


class ExceptionCase(Base):
    """Operational exception case detected by scheduled queries and investigated by AI."""
    __tablename__ = "exception_cases"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    case_number = Column(String(20), unique=True, nullable=False, index=True)
    exception_type = Column(String(30), nullable=False, index=True)  # 'delayed_order', 'sla_risk', 'overdue_invoice'
    severity = Column(String(10), nullable=False, index=True)  # 'low', 'medium', 'high', 'critical'
    status = Column(String(20), nullable=False, default="detected", index=True)
    # 'detected', 'investigating', 'recommendation_ready', 'approved', 'rejected', 'resolved', 'escalated'
    related_order_id = Column(GUID, ForeignKey("orders.id", ondelete="SET NULL"), nullable=True, index=True)
    related_customer_id = Column(GUID, ForeignKey("customers.id", ondelete="SET NULL"), nullable=True, index=True)

    # AI-Generated Investigation Insights
    investigation_summary = Column(Text, nullable=True)
    root_cause = Column(Text, nullable=True)
    business_impact = Column(Text, nullable=True)
    recommended_action = Column(Text, nullable=True)
    confidence_score = Column(Float, nullable=True)
    sources_used = Column(JSON, nullable=True)  # [{"type": "database", ...}, {"type": "rag", ...}]
    investigation_steps = Column(JSON, nullable=True)  # [{"step": "...", "detail": "...", "status": "completed"}]

    assigned_to = Column(GUID, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    detected_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by = Column(GUID, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    order = relationship("Order", back_populates="exceptions")
    customer = relationship("Customer", back_populates="exceptions")
    resolver = relationship("User", foreign_keys=[resolved_by])
    assignee = relationship("User", foreign_keys=[assigned_to])
    actions = relationship("ExceptionAction", back_populates="exception_case", cascade="all, delete-orphan")

    @property
    def resolver_name(self) -> str | None:
        resolver = self.__dict__.get("resolver")
        if not resolver:
            return None
        import re
        return re.sub(r"\s*\((?:Manager|Admin|Operator)\)$", "", resolver.name, flags=re.IGNORECASE).strip()

    @property
    def resolver_designation(self) -> str | None:
        resolver = self.__dict__.get("resolver")
        if not resolver:
            return None
        role_map = {
            "manager": "Operations Manager",
            "admin": "System Administrator",
            "operator": "Operations Operator",
        }
        return role_map.get(resolver.role.lower(), resolver.role.capitalize())

    @property
    def resolver_display(self) -> str | None:
        resolver = self.__dict__.get("resolver")
        if not resolver:
            return None
        name = self.resolver_name
        desig = self.resolver_designation
        return f"{name} ({desig})" if name and desig else name
