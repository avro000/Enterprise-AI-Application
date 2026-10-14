"""Sentence Transformer Embedding Service."""

import asyncio
import logging
from typing import List, Union
import numpy as np
from sentence_transformers import SentenceTransformer

from app.config import settings

logger = logging.getLogger("embedding_service")


class EmbeddingService:
    """Singleton embedding service generating normalized 384-dimensional dense vectors."""

    _model: SentenceTransformer = None

    @classmethod
    def get_model(cls) -> SentenceTransformer:
        """Loads and caches the SentenceTransformer model in memory."""
        if cls._model is None:
            logger.info(f"Loading embedding model '{settings.EMBEDDING_MODEL}' into memory...")
            try:
                cls._model = SentenceTransformer(settings.EMBEDDING_MODEL, local_files_only=True)
            except Exception:
                cls._model = SentenceTransformer(settings.EMBEDDING_MODEL)
            logger.info("Embedding model loaded successfully.")
        return cls._model

    @classmethod
    def _embed_sync(cls, texts: List[str]) -> np.ndarray:
        """Synchronously computes normalized embeddings for a list of strings."""
        model = cls.get_model()
        # Compute embeddings with L2 normalization for direct inner product cosine search
        embeddings = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
        return np.array(embeddings, dtype=np.float32)

    @classmethod
    async def embed_texts(cls, texts: List[str]) -> np.ndarray:
        """Asynchronously computes embeddings in a worker thread."""
        if not texts:
            return np.empty((0, settings.EMBEDDING_DIMENSIONS), dtype=np.float32)
        return await asyncio.to_thread(cls._embed_sync, texts)

    @classmethod
    async def embed_query(cls, query: str) -> np.ndarray:
        """Computes a single 1D/2D embedding for a search query string."""
        embeddings = await cls.embed_texts([query])
        return embeddings[0]
