"""User ORM Model placeholder."""

from app.database import Base


class User(Base):
    """Placeholder for User entity representing system operators, managers, and admins."""
    __tablename__ = "users"

    # Schema defined in TECHNICAL_SPEC.md Section 5.1
