"""Knowledge Document Schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class DocumentUploadResponse(BaseModel):
    id: UUID
    filename: str
    status: str
    message: str


class DocumentResponse(BaseModel):
    id: UUID
    filename: str
    file_type: str
    file_size_bytes: Optional[int] = None
    total_chunks: int
    storage_key: Optional[str] = None
    status: str
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentDownloadUrlResponse(BaseModel):
    download_url: str
    filename: str
    expires_in_seconds: int


class DocumentChunkResponse(BaseModel):
    id: UUID
    chunk_index: int
    page_number: Optional[int] = None
    token_count: Optional[int] = None
    content: str

    model_config = ConfigDict(from_attributes=True)


class DocumentViewResponse(BaseModel):
    id: UUID
    filename: str
    file_type: str
    file_size_bytes: Optional[int] = None
    total_chunks: int
    status: str
    uploaded_at: datetime
    full_text: str
    chunks: list[DocumentChunkResponse] = []

    model_config = ConfigDict(from_attributes=True)
