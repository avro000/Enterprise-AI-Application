"""RAG Pipeline Service orchestrating text extraction, embedding, vector store, and generation."""

import logging
from typing import Any, Dict, List, Optional
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.models.document import KnowledgeDocument
from app.models.document_chunk import DocumentChunk
from app.services.chunking import TextChunker
from app.services.document_processor import DocumentProcessor
from app.services.embedding_service import EmbeddingService
from app.services.llm_service import LLMService
from app.services.retriever import RetrieverService
from app.services.storage_service import StorageService

logger = logging.getLogger("rag_service")


class RAGService:
    """Orchestrates document ingestion, chunk indexing, and knowledge-grounded query answering via Neon pgvector."""

    @classmethod
    async def ingest_document(
        cls,
        db: AsyncSession,
        file_bytes: bytes,
        filename: str,
        user_id: Optional[Any] = None,
    ) -> KnowledgeDocument:
        """Processes an uploaded file: extracts text, chunks, embeds, and indexes into Neon pgvector."""
        ext = filename.lower().split(".")[-1]
        
        # 1. Create document entry
        doc_record = KnowledgeDocument(
            filename=filename,
            file_type=ext,
            file_size_bytes=len(file_bytes),
            status="processing",
            uploaded_by=user_id,
        )
        db.add(doc_record)
        await db.commit()
        await db.refresh(doc_record)

        try:
            # 2. Upload raw document file to Neon S3 Object Storage
            mime_map = {
                "pdf": "application/pdf",
                "txt": "text/plain",
                "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            }
            content_type = mime_map.get(ext, "application/octet-stream")
            storage_key = f"documents/{doc_record.id}/{filename}"
            await StorageService.upload_file(file_bytes, storage_key, content_type)
            doc_record.storage_key = storage_key

            # 3. Extract text pages
            pages = DocumentProcessor.extract_text(file_bytes, filename)

            # 3. Chunk text
            chunker = TextChunker()
            chunk_dicts = chunker.chunk_document_pages(pages)

            if not chunk_dicts:
                raise ValueError("No text chunks could be produced from the document.")

            # 4. Generate embeddings for all chunks
            texts_to_embed = [c["content"] for c in chunk_dicts]
            embeddings = await EmbeddingService.embed_texts(texts_to_embed)

            # 5. Save chunk records with native pgvector embeddings
            for chunk_data, emb in zip(chunk_dicts, embeddings):
                db_chunk = DocumentChunk(
                    document_id=doc_record.id,
                    chunk_index=chunk_data["chunk_index"],
                    content=chunk_data["content"],
                    page_number=chunk_data["page_number"],
                    embedding=emb,
                    token_count=chunk_data["token_count"],
                )
                db.add(db_chunk)

            # 6. Update document status
            doc_record.status = "indexed"
            doc_record.total_chunks = len(chunk_dicts)
            await db.commit()
            await db.refresh(doc_record)

            # 7. Audit log
            audit = AuditLog(
                event_type="document_uploaded",
                actor_type="user" if user_id else "system",
                actor_id=user_id,
                entity_type="document",
                entity_id=doc_record.id,
                details={"filename": filename, "total_chunks": len(chunk_dicts)},
            )
            db.add(audit)
            await db.commit()

            return doc_record

        except Exception as e:
            logger.error(f"Failed to ingest document '{filename}': {e}")
            doc_record.status = "error"
            doc_record.error_message = str(e)
            await db.commit()
            raise

    @classmethod
    async def delete_document(cls, db: AsyncSession, document_id: Any, actor_id: Optional[Any] = None) -> bool:
        """Deletes a document, cascading chunk records and native vector embeddings in Neon."""
        doc_stmt = select(KnowledgeDocument).where(KnowledgeDocument.id == document_id)
        doc = (await db.execute(doc_stmt)).scalars().first()
        if not doc:
            return False

        filename = doc.filename
        storage_key = doc.storage_key

        # Delete from Neon Object Storage if stored
        if storage_key:
            try:
                await StorageService.delete_file(storage_key)
            except Exception as e:
                logger.warning(f"Failed to delete cloud storage object '{storage_key}': {e}")

        await db.delete(doc)
        await db.commit()

        # Audit log
        audit = AuditLog(
            event_type="document_deleted",
            actor_type="user" if actor_id else "system",
            actor_id=actor_id,
            entity_type="document",
            entity_id=document_id,
            details={"filename": filename},
        )
        db.add(audit)
        await db.commit()

        return True

    @classmethod
    async def answer_knowledge_question(
        cls,
        db: AsyncSession,
        question: str,
        top_k: int = 5,
        min_score: float = 0.3,
    ) -> Dict[str, Any]:
        """Answers a question grounded purely in knowledge base documents with source citations."""
        chunks = await RetrieverService.retrieve_relevant_chunks(question, db, top_k=top_k, min_score=min_score)

        if not chunks:
            return {
                "answer": "I don't have enough information in the knowledge base to answer that question.",
                "sources": [],
                "confidence": "low",
            }

        formatted_chunks = []
        sources = []
        for c in chunks:
            formatted_chunks.append(f"[{c['document_name']} | Page {c['page_number']}]:\n{c['content']}")
            sources.append({
                "type": "document",
                "name": c["document_name"],
                "page": c["page_number"],
                "relevance": c["relevance"],
            })

        rag_text = "\n\n---\n\n".join(formatted_chunks)
        prompt = (
            f"SYSTEM:\n"
            f"You are OpsPilot AI. Answer the question ONLY using the provided knowledge base context.\n"
            f"If the context does not contain enough information, state: 'I don't have enough information in the knowledge base to answer that question.'\n\n"
            f"--- KNOWLEDGE BASE ---\n"
            f"{rag_text}\n"
            f"--- END KNOWLEDGE BASE ---\n\n"
            f"QUESTION:\n{question}"
        )

        answer = await LLMService.generate_response(prompt)
        confidence = "high" if chunks and chunks[0]["relevance"] >= 0.6 else "medium"

        return {
            "answer": answer.strip(),
            "intent": "knowledge_only",
            "sources": sources,
            "confidence": confidence,
        }

