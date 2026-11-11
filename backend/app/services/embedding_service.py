"""Lightweight Embedding Service with FastEmbed, SentenceTransformer, and Fallback support."""

import asyncio
import hashlib
import logging
import random
from typing import List
import numpy as np

from app.config import settings

logger = logging.getLogger("embedding_service")


class EmbeddingService:
    """Singleton embedding service generating normalized 384-dimensional dense vectors."""

    _model = None
    _provider = None

    @classmethod
    def get_model(cls):
        """Loads and caches the embedding model in memory."""
        if cls._model is not None:
            return cls._model

        # 1. Try FastEmbed (ultra-lightweight ONNX runtime, ~40MB RAM, no PyTorch/CUDA)
        try:
            from fastembed import TextEmbedding
            logger.info("Loading FastEmbed 'sentence-transformers/all-MiniLM-L6-v2'...")
            cls._model = TextEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")
            cls._provider = "fastembed"
            logger.info("FastEmbed model loaded successfully.")
            return cls._model
        except Exception as e:
            logger.info(f"FastEmbed not available ({e}), trying SentenceTransformer...")

        # 2. Try SentenceTransformer (lazy import)
        try:
            from sentence_transformers import SentenceTransformer
            logger.info(f"Loading SentenceTransformer '{settings.EMBEDDING_MODEL}'...")
            cls._model = SentenceTransformer(settings.EMBEDDING_MODEL)
            cls._provider = "sentence_transformers"
            logger.info("SentenceTransformer model loaded successfully.")
            return cls._model
        except Exception as e:
            logger.warning(f"SentenceTransformer not available ({e}), using deterministic 384-d vector fallback.")
            cls._provider = "fallback"
            return None

    @classmethod
    def _fallback_embed(cls, text: str) -> np.ndarray:
        """Generates a deterministic 384-dimensional normalized vector from text hash."""
        h = hashlib.sha256(text.encode("utf-8")).digest()
        r = random.Random(h)
        vec = np.array([r.gauss(0, 1) for _ in range(settings.EMBEDDING_DIMENSIONS)], dtype=np.float32)
        norm = np.linalg.norm(vec)
        return vec / norm if norm > 0 else vec

    @classmethod
    def _embed_sync(cls, texts: List[str]) -> np.ndarray:
        """Synchronously computes normalized embeddings for a list of strings."""
        if not texts:
            return np.empty((0, settings.EMBEDDING_DIMENSIONS), dtype=np.float32)

        model = cls.get_model()

        if cls._provider == "fastembed" and model is not None:
            embeddings_list = list(model.embed(texts))
            return np.array(embeddings_list, dtype=np.float32)

        if cls._provider == "sentence_transformers" and model is not None:
            embeddings = model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
            return np.array(embeddings, dtype=np.float32)

        # Fallback
        results = [cls._fallback_embed(t) for t in texts]
        return np.array(results, dtype=np.float32)

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
