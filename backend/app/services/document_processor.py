"""Document text extraction service for PDF, DOCX, and TXT files."""

import io
import re
from typing import List, Tuple
import docx
import PyPDF2


class DocumentProcessor:
    """Extracts cleaned text and page-level metadata from uploaded enterprise files."""

    @staticmethod
    def clean_text(text: str) -> str:
        """Normalizes whitespace and removes unprintable control characters."""
        if not text:
            return ""
        # Remove null and non-printable control chars except tabs/newlines
        text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]", "", text)
        # Normalize multiple spaces and excess blank lines
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()

    @classmethod
    def extract_text(cls, file_bytes: bytes, filename: str) -> List[Tuple[int, str]]:
        """Extracts text sections tagged with page or section indices.

        Returns: List of (page_number_or_1, raw_text)
        """
        ext = filename.lower().split(".")[-1]
        results = []

        if ext == "pdf":
            reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
            for idx, page in enumerate(reader.pages):
                page_text = page.extract_text() or ""
                cleaned = cls.clean_text(page_text)
                if cleaned:
                    results.append((idx + 1, cleaned))

        elif ext in ("docx", "doc"):
            doc = docx.Document(io.BytesIO(file_bytes))
            full_text = "\n".join([p.text for p in doc.paragraphs if p.text])
            cleaned = cls.clean_text(full_text)
            if cleaned:
                results.append((1, cleaned))

        elif ext == "txt":
            try:
                raw = file_bytes.decode("utf-8")
            except UnicodeDecodeError:
                raw = file_bytes.decode("latin-1", errors="ignore")
            cleaned = cls.clean_text(raw)
            if cleaned:
                results.append((1, cleaned))

        else:
            raise ValueError(f"Unsupported file format: .{ext}. Supported formats: pdf, docx, txt")

        if not results:
            raise ValueError(f"No extractable text found in '{filename}'. The file may be empty or an unreadable image scan.")

        return results
