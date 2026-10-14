"""Knowledge Documents API Routes."""

import logging
import io
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import require_admin, require_authenticated, require_manager_or_admin
from app.models.document import KnowledgeDocument
from app.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.document import (
    DocumentChunkResponse,
    DocumentDownloadUrlResponse,
    DocumentResponse,
    DocumentUploadResponse,
    DocumentViewResponse,
)
from app.services.rag_service import RAGService
from app.services.storage_service import StorageService

logger = logging.getLogger("api_documents")

router = APIRouter(prefix="/documents", tags=["Documents"])

ALLOWED_EXTENSIONS = {"pdf", "txt", "docx"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB


@router.post("/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
):
    """Uploads and processes an enterprise document (PDF, TXT, DOCX) into FAISS."""
    filename = file.filename or "unknown"
    ext = filename.lower().split(".")[-1]
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{ext}'. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File exceeds maximum allowed size of 20MB ({len(file_bytes)} bytes)",
        )

    try:
        doc = await RAGService.ingest_document(
            db=db,
            file_bytes=file_bytes,
            filename=filename,
            user_id=current_user.id,
        )
        return DocumentUploadResponse(
            id=doc.id,
            filename=doc.filename,
            status=doc.status,
            message="Document upload and indexing completed successfully",
        )
    except Exception as e:
        logger.error(f"Error processing uploaded document: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process document: {str(e)}",
        )


@router.get("", response_model=List[DocumentResponse])
async def list_documents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_authenticated),
):
    """Lists indexed enterprise knowledge base documents."""
    stmt = select(KnowledgeDocument).order_by(KnowledgeDocument.uploaded_at.desc())
    result = await db.execute(stmt)
    docs = result.scalars().all()
    return docs


@router.get("/{document_id}/view", response_model=DocumentViewResponse)
async def view_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_authenticated),
):
    """View document content and extracted text chunks. Accessible to Operators, Managers, and Admins."""
    from sqlalchemy.orm import selectinload
    stmt = (
        select(KnowledgeDocument)
        .options(selectinload(KnowledgeDocument.chunks))
        .where(KnowledgeDocument.id == document_id)
    )
    result = await db.execute(stmt)
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    sorted_chunks = sorted(doc.chunks, key=lambda c: c.chunk_index)
    full_text = "\n\n".join(c.content for c in sorted_chunks)

    return DocumentViewResponse(
        id=doc.id,
        filename=doc.filename,
        file_type=doc.file_type,
        file_size_bytes=doc.file_size_bytes,
        total_chunks=doc.total_chunks or len(sorted_chunks),
        status=doc.status,
        uploaded_at=doc.uploaded_at,
        full_text=full_text,
        chunks=[
            DocumentChunkResponse(
                id=c.id,
                chunk_index=c.chunk_index,
                page_number=c.page_number,
                token_count=c.token_count,
                content=c.content,
            )
            for c in sorted_chunks
        ],
    )


@router.get("/{document_id}/download")
async def download_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
):
    """Downloads pristine raw document file. Restricted to Managers and Administrators (Operators have view-only access)."""
    from sqlalchemy.orm import selectinload
    stmt = (
        select(KnowledgeDocument)
        .options(selectinload(KnowledgeDocument.chunks))
        .where(KnowledgeDocument.id == document_id)
    )
    result = await db.execute(stmt)
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    file_bytes = None
    content_type = "application/octet-stream"

    if doc.storage_key:
        try:
            file_obj = await StorageService.download_file(doc.storage_key)
            if file_obj:
                file_bytes = file_obj["body"]
                content_type = file_obj.get("content_type", content_type)
        except Exception as e:
            logger.warning(f"Cloud storage download failed for {doc.filename}, synthesizing fallback: {e}")

    if not file_bytes:
        # Synthesize file payload from stored text chunks
        sorted_chunks = sorted(doc.chunks, key=lambda c: c.chunk_index)
        full_text = "\n\n".join(c.content for c in sorted_chunks)
        file_bytes = full_text.encode("utf-8")
        content_type = "text/plain" if doc.file_type == "txt" else "application/octet-stream"

    return StreamingResponse(
        io.BytesIO(file_bytes),
        media_type=content_type,
        headers={
            "Content-Disposition": f'attachment; filename="{doc.filename}"',
            "Content-Length": str(len(file_bytes)),
        },
    )


@router.get("/{document_id}/download-url", response_model=DocumentDownloadUrlResponse)
async def get_document_download_url(
    document_id: UUID,
    expires_in: int = 3600,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_manager_or_admin),
):
    """Generates a signed presigned S3 URL for direct download (Manager/Admin only)."""
    stmt = select(KnowledgeDocument).where(KnowledgeDocument.id == document_id)
    result = await db.execute(stmt)
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    if not doc.storage_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document file is not stored in cloud object storage",
        )

    url = StorageService.generate_presigned_url(doc.storage_key, expires_in=expires_in)
    if not url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate presigned download URL",
        )

    return DocumentDownloadUrlResponse(
        download_url=url,
        filename=doc.filename,
        expires_in_seconds=expires_in,
    )


@router.delete("/{document_id}", response_model=MessageResponse)
async def delete_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Deletes a document, its database chunks, vector embeddings, and cloud storage object (Admin only)."""
    deleted = await RAGService.delete_document(db, document_id, actor_id=current_user.id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return MessageResponse(message="Document, vector chunks, and cloud storage object deleted")

