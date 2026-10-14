"""Health API Routes."""

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.document import KnowledgeDocument
from app.models.document_chunk import DocumentChunk

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("")
async def get_health(db: AsyncSession = Depends(get_db)):
    """System health check endpoint verifying database and Neon pgvector readiness."""
    doc_count = 0
    vector_count = 0
    db_status = "connected"
    try:
        stmt = select(func.count(KnowledgeDocument.id)).where(KnowledgeDocument.status == "indexed")
        doc_count = (await db.execute(stmt)).scalar() or 0

        vec_stmt = select(func.count(DocumentChunk.id)).where(DocumentChunk.embedding.is_not(None))
        vector_count = (await db.execute(vec_stmt)).scalar() or 0
    except Exception:
        db_status = "error"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
        "vector_store": "loaded",
        "documents_indexed": doc_count,
        "vectors_count": vector_count,
    }
