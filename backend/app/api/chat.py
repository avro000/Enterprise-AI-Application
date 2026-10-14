"""Chat & Copilot API Routes."""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_authenticated
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.context_fusion import ContextFusionService

logger = logging.getLogger("api_chat")

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_authenticated),
):
    """Context fusion RAG chat endpoint answering queries with structured DB data and unstructured policies."""
    try:
        result = await ContextFusionService.process_chat_query(
            question=request.question,
            db=db,
        )

        # Audit log entry
        audit = AuditLog(
            event_type="chat_query",
            actor_type="user",
            actor_id=current_user.id,
            entity_type="chat",
            details={
                "question": request.question,
                "intent": result.get("intent"),
                "confidence": result.get("confidence"),
                "sources_count": len(result.get("sources", [])),
            },
        )
        db.add(audit)
        await db.commit()

        return ChatResponse(
            answer=result["answer"],
            intent=result["intent"],
            sources=result["sources"],
            confidence=result["confidence"],
        )
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while processing your query: {str(e)}",
        )

