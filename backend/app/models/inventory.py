"""Inventory ORM Model."""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.types import GUID


class Inventory(Base):
    """Inventory item tracking stock levels, reorder thresholds, and suppliers."""
    __tablename__ = "inventory"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    sku = Column(String(50), unique=True, nullable=False, index=True)
    product_name = Column(String(255), nullable=False)
    quantity_available = Column(Integer, nullable=False, default=0)
    reorder_threshold = Column(Integer, nullable=False, default=10)
    unit_cost = Column(Float, nullable=True)
    supplier_id = Column(GUID, ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    supplier = relationship("Supplier", back_populates="inventory_items")
    order_items = relationship("OrderItem", back_populates="inventory_item")
