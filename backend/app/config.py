import os
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_DIR = Path(__file__).resolve().parent.parent
_ENV_PATH = _BACKEND_DIR / ".env"


class Settings(BaseSettings):
    # Environment
    ENVIRONMENT: str = "development"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://opspilot:opspilot@localhost:5432/opspilot"

    # Security & JWT
    JWT_SECRET_KEY: str = "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_HOURS: int = 24
    RESET_TOKEN_EXPIRY_MINUTES: int = 15

    # OTP Password Recovery & Registration Settings (5-minute expiration)
    OTP_EXPIRY_MINUTES: int = 5
    OTP_MAX_ATTEMPTS: int = 5

    # Email Validation & Deliverability
    VALIDATE_EMAIL_DELIVERABILITY: bool = True

    # Email / SMTP Configuration
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_TLS: bool = True
    EMAILS_FROM_EMAIL: str = "noreply@opspilot.ai"
    EMAILS_FROM_NAME: str = "OpsPilot AI Security"

    # LLM Settings
    LLM_PROVIDER: str = "gemini"  # 'gemini', 'openai', or 'mock'
    GEMINI_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    LLM_MODEL: str = "gemini-3.5-flash-lite"

    LLM_TEMPERATURE: float = 0.1
    LLM_MAX_TOKENS: int = 4096
    MOCK_LLM_FALLBACK: bool = True  # Automatically fallback to deterministic mock if no key provided

    # Embeddings & Vector Store (Neon pgvector)
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    EMBEDDING_DIMENSIONS: int = 384

    # RAG Settings
    CHUNK_SIZE: int = 600
    CHUNK_OVERLAP: int = 100
    RETRIEVAL_TOP_K: int = 5
    RETRIEVAL_MIN_SCORE: float = 0.3

    # Exception Detection Engine
    EXCEPTION_CHECK_INTERVAL_MINUTES: int = 15
    SLA_RISK_HORIZON_HOURS: int = 48

    # Neon Object Storage (Cloud S3-compatible)
    NEON_STORAGE_ENDPOINT: Optional[str] = None
    NEON_STORAGE_REGION: str = "us-east-2"
    NEON_STORAGE_BUCKET: str = "docs"
    NEON_STORAGE_ACCESS_KEY_ID: Optional[str] = None
    NEON_STORAGE_SECRET_ACCESS_KEY: Optional[str] = None

    # CORS & Networking
    FRONTEND_URL: str = "http://localhost:5173"
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000

    model_config = SettingsConfigDict(
        env_file=(str(_ENV_PATH), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
