"""Text chunking service with recursive character boundary splitting."""

from typing import Any, Dict, List, Optional, Tuple


class TextChunker:
    """Splits long text documents into token-sized chunks with semantic overlap."""

    def __init__(
        self,
        chunk_size_chars: Optional[int] = None,
        overlap_chars: Optional[int] = None,
        chunk_size: Optional[int] = None,
        chunk_overlap: Optional[int] = None,
        separators: Optional[List[str]] = None,
    ):
        self.chunk_size = chunk_size or chunk_size_chars or 2400
        self.overlap = chunk_overlap if chunk_overlap is not None else (overlap_chars if overlap_chars is not None else 400)
        self.separators = separators or ["\n\n", "\n", ". ", " "]

    def chunk_text(self, text: str) -> List[Dict[str, Any]]:
        """Convenience method for chunking raw text strings."""
        if not text or not text.strip():
            return []
        return self.chunk_document_pages([(1, text)])


    def _split_text(self, text: str, separators: List[str]) -> List[str]:
        """Recursively splits text by priority separators until pieces fit in chunk_size."""
        final_chunks = []
        separator = separators[-1]
        new_separators = []

        for i, s in enumerate(separators):
            if s in text:
                separator = s
                new_separators = separators[i + 1 :]
                break

        splits = text.split(separator)
        current_doc = []
        total_len = 0

        for piece in splits:
            piece_len = len(piece) + (len(separator) if current_doc else 0)
            if total_len + piece_len <= self.chunk_size:
                current_doc.append(piece)
                total_len += piece_len
            else:
                if current_doc:
                    doc_text = separator.join(current_doc).strip()
                    if doc_text:
                        final_chunks.append(doc_text)
                    # Overlap handling: preserve last parts up to overlap_chars
                    overlap_doc = []
                    overlap_len = 0
                    for prev_piece in reversed(current_doc):
                        if overlap_len + len(prev_piece) <= self.overlap:
                            overlap_doc.insert(0, prev_piece)
                            overlap_len += len(prev_piece)
                        else:
                            break
                    current_doc = overlap_doc
                    total_len = overlap_len

                if new_separators and len(piece) > self.chunk_size:
                    sub_chunks = self._split_text(piece, new_separators)
                    final_chunks.extend(sub_chunks)
                else:
                    current_doc.append(piece)
                    total_len += len(piece)

        if current_doc:
            doc_text = separator.join(current_doc).strip()
            if doc_text:
                final_chunks.append(doc_text)

        return final_chunks

    def chunk_document_pages(self, pages: List[Tuple[int, str]]) -> List[Dict[str, Any]]:
        """Processes extracted pages into chunk dictionaries with metadata."""
        chunks = []
        chunk_idx = 0

        for page_num, text in pages:
            if not text:
                continue
            page_chunks = self._split_text(text, self.separators)
            for c_text in page_chunks:
                c_text = c_text.strip()
                if not c_text:
                    continue
                # Rough token estimate: ~4 characters per token
                approx_tokens = max(1, len(c_text) // 4)
                chunks.append({
                    "chunk_index": chunk_idx,
                    "content": c_text,
                    "page_number": page_num,
                    "token_count": approx_tokens,
                })
                chunk_idx += 1

        return chunks
