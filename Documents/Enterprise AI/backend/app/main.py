"""OpsPilot AI Backend FastAPI Application Entrypoint."""

from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("opspilot")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager for startup and shutdown routines."""
    logger.info("OpsPilot AI starting up...")
    # 1. Connect to database / verify schema
    # 2. Load embedding model
    # 3. Load FAISS index from disk
    # 4. Start scheduler for exception detection
    yield
    logger.info("OpsPilot AI shutting down...")
    # 1. Save FAISS index
    # 2. Stop scheduler


app = FastAPI(
    title="OpsPilot AI API",
    description="Enterprise Operations Intelligence & Action Platform",
    version="0.1.0",
    lifespan=lifespan,
)

# Configure CORS
origins = [settings.FRONTEND_URL, "http://localhost:5173", "http://127.0.0.1:5173"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", tags=["Health"])
async def health_check():
    """Health check endpoint placeholder."""
    return {
        "status": "healthy",
        "database": "connected",
        "vector_store": "loaded",
        "documents_indexed": 0,
        "vectors_count": 0,
    }
