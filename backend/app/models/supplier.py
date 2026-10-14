"""Supplier ORM Model."""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Float, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.types import GUID


class Supplier(Base):
    """Supplier entity for inventory sourcing and supplier reliability tracking."""
    __tablename__ = "suppliers"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, index=True)
    contact_email = Column(String(255))
    lead_time_days = Column(Integer, nullable=False, default=7)
    reliability_score = Column(Float, default=0.95)  # 0.00 to 1.00
    status = Column(String(20), default="active")  # 'active', 'delayed', 'inactive'
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    inventory_items = relationship("Inventory", back_populates="supplier")
