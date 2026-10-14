"""DocumentChunk ORM Model."""

import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import relationship

from pgvector.sqlalchemy import Vector
from app.database import Base
from app.models.types import GUID


class DocumentChunk(Base):
    """Text chunk derived from an ingested document, with native vector embedding."""
    __tablename__ = "document_chunks"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    document_id = Column(GUID, ForeignKey("knowledge_documents.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    page_number = Column(Integer, nullable=True)
    embedding = Column(Vector(384), nullable=True)
    faiss_vector_id = Column(Integer, nullable=True)
    token_count = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    document = relationship("KnowledgeDocument", back_populates="chunks")
