"""Customer ORM Model."""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.types import GUID


class Customer(Base):
    """Customer entity with support tiers (standard, premium, enterprise) and SLAs."""
    __tablename__ = "customers"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    company_name = Column(String(255), nullable=False, index=True)
    contact_name = Column(String(255))
    contact_email = Column(String(255))
    tier = Column(String(20), nullable=False, default="standard")  # standard, premium, enterprise
    region = Column(String(100))
    sla_hours = Column(Integer, nullable=False, default=72)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    orders = relationship("Order", back_populates="customer")
    exceptions = relationship("ExceptionCase", back_populates="customer")
