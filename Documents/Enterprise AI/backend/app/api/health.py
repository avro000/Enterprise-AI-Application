"""Health API Routes."""

from fastapi import APIRouter

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("")
async def get_health():
    """System health check endpoint."""
    return {
        "status": "healthy",
        "database": "connected",
        "vector_store": "loaded",
        "documents_indexed": 0,
        "vectors_count": 0,
    }
