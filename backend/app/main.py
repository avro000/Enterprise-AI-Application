"""OpsPilot AI Backend FastAPI Application Entrypoint."""

from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, chat, dashboard, documents, exceptions, health, users
from app.config import settings
from app.core.scheduler import start_scheduler, stop_scheduler
from app.database import init_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("opspilot")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager for startup and shutdown routines."""
    logger.info("OpsPilot AI starting up...")
    # 1. Initialize database schema
    try:
        await init_db()
        logger.info("Database schema initialized/verified.")
    except Exception as e:
        logger.warning(f"Database schema init notice: {e}")

    # 2. Start scheduler for exception detection
    try:
        start_scheduler()
    except Exception as e:
        logger.error(f"Failed to start scheduler: {e}")

    yield

    logger.info("OpsPilot AI shutting down...")
    # 1. Stop scheduler
    try:
        stop_scheduler()
    except Exception as e:
        logger.error(f"Failed to stop scheduler: {e}")


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

# Register API Routers
app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(exceptions.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")


@app.get("/", tags=["Root"])
async def root():
    """Root metadata endpoint."""
    return {
        "project": "OpsPilot AI",
        "description": "Enterprise Operations Intelligence & Action Platform",
        "status": "online",
        "version": "0.1.0",
        "docs": "/docs",
    }

