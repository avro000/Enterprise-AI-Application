"""Chat & Retrieval Schemas."""

from typing import Any, Dict, List
from pydantic import BaseModel


class ChatRequest(BaseModel):
    question: str


class ChatResponse(BaseModel):
    answer: str
    intent: str
    sources: List[Dict[str, Any]]
    confidence: str
