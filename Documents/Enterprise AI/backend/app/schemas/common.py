"""Common shared Pydantic schemas."""

from typing import Generic, List, Optional, TypeVar
from pydantic import BaseModel

T = TypeVar("T")


class MessageResponse(BaseModel):
    message: str


class ErrorResponse(BaseModel):
    detail: str
    error_code: Optional[str] = None


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
