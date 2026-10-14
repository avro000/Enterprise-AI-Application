"""Semantic Retriever Service using Neon pgvector."""

from typing import Any, Dict, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import KnowledgeDocument
from app.models.document_chunk import DocumentChunk
from app.services.embedding_service import EmbeddingService


class RetrieverService:
    """Retrieves semantically relevant document chunks with source metadata using Neon pgvector."""

    @classmethod
    async def retrieve_relevant_chunks(
        cls,
        query: str,
        db: AsyncSession,
        top_k: int = 5,
        min_score: float = 0.3,
    ) -> List[Dict[str, Any]]:
        """Finds top-k document chunks with similarity score >= min_score via native SQL vector search."""
        if not query.strip():
            return []

        # 1. Generate query embedding
        query_vec = await EmbeddingService.embed_query(query)
        if isinstance(query_vec, (list, tuple)) and len(query_vec) == 0:
            return []

        # 2. Native pgvector cosine distance query
        cos_distance = DocumentChunk.embedding.cosine_distance(query_vec)
        similarity = 1 - cos_distance

        stmt = (
            select(
                DocumentChunk,
                KnowledgeDocument.filename.label("document_name"),
                similarity.label("relevance"),
            )
            .join(KnowledgeDocument, DocumentChunk.document_id == KnowledgeDocument.id)
            .where(DocumentChunk.embedding.is_not(None))
            .where(similarity >= min_score)
            .order_by(cos_distance.asc())
            .limit(top_k)
        )

        rows = (await db.execute(stmt)).all()

        # 3. Format results sorted by similarity score descending
        chunks_with_metadata = []
        for chunk, filename, relevance in rows:
            chunks_with_metadata.append({
                "chunk_id": str(chunk.id),
                "document_id": str(chunk.document_id),
                "document_name": filename,
                "page_number": chunk.page_number,
                "content": chunk.content,
                "relevance": round(float(relevance), 3),
            })

        return chunks_with_metadata
