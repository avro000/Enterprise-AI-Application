"""Order and OrderItem ORM Model placeholders."""

from app.database import Base


class Order(Base):
    """Placeholder for Order entity."""
    __tablename__ = "orders"


class OrderItem(Base):
    """Placeholder for OrderItem entity."""
    __tablename__ = "order_items"
