"""OTP Code ORM Model for Secure Password Recovery."""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.types import GUID


class OTPCode(Base):
    """Stores cryptographically hashed one-time passwords for password reset and verification."""
    __tablename__ = "otp_codes"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    otp_hash = Column(String(255), nullable=False)  # Hashed OTP for zero-plaintext storage
    purpose = Column(String(50), nullable=False, default="password_reset")
    expires_at = Column(DateTime(timezone=True), nullable=False)
    attempts = Column(Integer, default=0, nullable=False)
    is_used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationship
    user = relationship("User", back_populates="otp_codes")
