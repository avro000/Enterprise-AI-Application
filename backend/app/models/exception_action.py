"""ExceptionAction ORM Model."""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.types import GUID


class ExceptionAction(Base):
    """Specific operational action recommended by AI requiring human governance/approval."""
    __tablename__ = "exception_actions"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    exception_id = Column(GUID, ForeignKey("exception_cases.id", ondelete="CASCADE"), nullable=False, index=True)
    action_type = Column(String(30), nullable=False)
    # 'notify_manager', 'create_task', 'draft_email', 'escalate_supplier', 'offer_alternative'
    description = Column(Text, nullable=False)
    requires_approval = Column(Boolean, default=True, nullable=False)
    status = Column(String(20), default="pending", index=True)  # 'pending', 'approved', 'rejected', 'executed', 'failed'
    approved_by = Column(GUID, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    executed_at = Column(DateTime(timezone=True), nullable=True)
    result = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    exception_case = relationship("ExceptionCase", back_populates="actions")
    approver = relationship("User", foreign_keys=[approved_by])

    @property
    def approver_name(self) -> str | None:
        approver = self.__dict__.get("approver")
        if not approver:
            return None
        import re
        return re.sub(r"\s*\((?:Manager|Admin|Operator)\)$", "", approver.name, flags=re.IGNORECASE).strip()

    @property
    def approver_role(self) -> str | None:
        approver = self.__dict__.get("approver")
        return approver.role if approver else None

    @property
    def approver_designation(self) -> str | None:
        approver = self.__dict__.get("approver")
        if not approver:
            return None
        role_map = {
            "manager": "Operations Manager",
            "admin": "System Administrator",
            "operator": "Operations Operator",
        }
        return role_map.get(approver.role.lower(), approver.role.capitalize())

    @property
    def approver_display(self) -> str | None:
        approver = self.__dict__.get("approver")
        if not approver:
            return None
        name = self.approver_name
        desig = self.approver_designation
        return f"{name} ({desig})" if name and desig else name
