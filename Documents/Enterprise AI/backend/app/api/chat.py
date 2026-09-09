"""Chat & Copilot API Routes."""

from fastapi import APIRouter
from app.schemas.chat import ChatRequest, ChatResponse

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Context fusion RAG chat endpoint placeholder."""
    pass
