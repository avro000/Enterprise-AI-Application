"""Application Settings & Configuration."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://opspilot:opspilot@localhost:5432/opspilot"

    # LLM
    LLM_PROVIDER: str = "gemini"
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    LLM_MODEL: str = "gemini-2.0-flash"
    LLM_TEMPERATURE: float = 0.1
    LLM_MAX_TOKENS: int = 1024

    # Embeddings
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    EMBEDDING_DIMENSIONS: int = 384

    # RAG
    CHUNK_SIZE: int = 600
    CHUNK_OVERLAP: int = 100
    RETRIEVAL_TOP_K: int = 5
    RETRIEVAL_MIN_SCORE: float = 0.3

    # FAISS
    FAISS_INDEX_PATH: str = "data/vector_store/faiss.index"

    # Security
    JWT_SECRET_KEY: str = "default_insecure_secret_key_change_me"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_HOURS: int = 24

    # Exception Detection
    EXCEPTION_CHECK_INTERVAL_MINUTES: int = 15
    SLA_RISK_HORIZON_HOURS: int = 48

    # CORS & Host
    FRONTEND_URL: str = "http://localhost:5173"
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
