"""User ORM Model."""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, String
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.types import GUID


class User(Base):
    """User entity representing operators, managers, and administrators."""
    __tablename__ = "users"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="operator")  # 'admin', 'manager', 'operator'
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    otp_codes = relationship("OTPCode", back_populates="user", cascade="all, delete-orphan")
