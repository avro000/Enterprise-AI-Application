"""KnowledgeDocument ORM Model."""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base
from app.models.types import GUID


class KnowledgeDocument(Base):
    """Knowledge base document metadata (PDF, DOCX, TXT)."""
    __tablename__ = "knowledge_documents"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(10), nullable=False)  # 'pdf', 'txt', 'docx'
    file_size_bytes = Column(Integer, nullable=True)
    total_chunks = Column(Integer, default=0)
    storage_key = Column(String(512), nullable=True)
    status = Column(String(20), default="processing", index=True)  # 'processing', 'indexed', 'error'
    uploaded_by = Column(GUID, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    uploaded_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    error_message = Column(Text, nullable=True)

    # Relationships
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")
    uploader = relationship("User")
