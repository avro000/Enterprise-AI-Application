"""Knowledge Document Schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel


class DocumentUploadResponse(BaseModel):
    id: UUID
    filename: str
    status: str
    message: str


class DocumentResponse(BaseModel):
    id: UUID
    filename: str
    file_type: str
    total_chunks: int
    status: str
    uploaded_at: datetime
