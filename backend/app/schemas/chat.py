"""Chat & Retrieval Schemas."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=2, description="Question for the operations copilot")


class SourceItem(BaseModel):
    type: str  # 'document' or 'database'
    name: Optional[str] = None
    page: Optional[int] = None
    relevance: Optional[float] = None
    table: Optional[str] = None
    detail: Optional[str] = None


class ChatResponse(BaseModel):
    answer: str
    intent: str  # 'knowledge_only', 'data_only', 'hybrid', 'exception_investigation'
    sources: List[Dict[str, Any]]
    confidence: str  # 'high', 'medium', 'low'
