"""Order and OrderItem ORM Models."""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.types import GUID


class Order(Base):
    """Customer Order entity tracked for delivery schedules and SLA commitments."""
    __tablename__ = "orders"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    order_number = Column(String(20), unique=True, nullable=False, index=True)
    customer_id = Column(GUID, ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    status = Column(String(20), nullable=False, default="pending", index=True)
    # 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'delayed', 'cancelled'
    total_amount = Column(Float, nullable=False, default=0.0)
    order_date = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    expected_delivery_date = Column(DateTime(timezone=True), nullable=False, index=True)
    actual_delivery_date = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    customer = relationship("Customer", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    exceptions = relationship("ExceptionCase", back_populates="order")


class OrderItem(Base):
    """Individual SKU line items belonging to an Order."""
    __tablename__ = "order_items"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    order_id = Column(GUID, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    sku = Column(String(50), ForeignKey("inventory.sku", ondelete="RESTRICT"), nullable=False, index=True)
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Float, nullable=False, default=0.0)

    # Relationships
    order = relationship("Order", back_populates="items")
    inventory_item = relationship("Inventory", back_populates="order_items")
