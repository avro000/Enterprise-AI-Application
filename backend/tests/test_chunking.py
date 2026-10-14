"""Text chunking tests."""

import pytest
from app.services.chunking import TextChunker


def test_chunk_empty_text():
    """Empty or whitespace text should produce no chunks."""
    chunker = TextChunker(chunk_size=100, chunk_overlap=20)
    chunks = chunker.chunk_text("")
    assert chunks == []

    chunks_ws = chunker.chunk_text("   \n\n\t  ")
    assert chunks_ws == []


def test_chunk_short_text():
    """Short text within token limit should produce exactly one chunk."""
    chunker = TextChunker(chunk_size=100, chunk_overlap=20)
    short_text = "This is a short policy statement regarding equipment maintenance."
    chunks = chunker.chunk_text(short_text)
    assert len(chunks) == 1
    assert chunks[0]["chunk_index"] == 0
    assert chunks[0]["content"] == short_text
    assert chunks[0]["token_count"] > 0


def test_chunk_long_text_overlap():
    """Long text exceeding chunk_size should produce multiple chunks with overlap."""
    chunker = TextChunker(chunk_size=50, chunk_overlap=10)
    long_text = "Standard Operating Procedure: All technicians must calibrate pressure gauges daily. " * 15
    chunks = chunker.chunk_text(long_text)
    assert len(chunks) > 1

    # Verify sequential indices
    indices = [c["chunk_index"] for c in chunks]
    assert indices == list(range(len(chunks)))

    # Verify each chunk stays reasonably within token budget
    for c in chunks:
        assert c["token_count"] <= 75  # tolerance for token estimation


def test_chunk_multi_page_document():
    """Multi-page document preserves page numbers across extracted chunks."""
    chunker = TextChunker(chunk_size=40, chunk_overlap=5)
    pages = [
        (1, "Page 1: SLA policies require 48 hour delivery for all premium tier clients."),
        (2, "Page 2: Standard tier orders allow 72 hour fulfillment windows."),
        (3, "Page 3: Return policies require items to be returned within 30 days."),
    ]
    chunks = chunker.chunk_document_pages(pages)
    assert len(chunks) >= 3

    page_numbers = {c["page_number"] for c in chunks}
    assert 1 in page_numbers
    assert 2 in page_numbers
    assert 3 in page_numbers

