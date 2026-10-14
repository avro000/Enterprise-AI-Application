"""SQLAlchemy Database Engine and Session Factory."""

from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base

from app.config import settings

# Engine configuration with connection pooling and health pre-ping
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False
else:
    # Required for Neon / PgBouncer transaction pooling with asyncpg
    connect_args["statement_cache_size"] = 0

engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
    pool_pre_ping=True,
    pool_recycle=300,
    connect_args=connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()
async_session_maker = AsyncSessionLocal


async def init_db() -> None:
    """Creates database tables if they do not already exist."""
    from sqlalchemy import text
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Migrate new columns on existing tables if needed
        try:
            await conn.execute(text("ALTER TABLE exception_cases ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id) ON DELETE SET NULL;"))
            await conn.execute(text("ALTER TABLE exception_cases ADD COLUMN IF NOT EXISTS investigation_steps JSONB;"))
            await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;"))
            await conn.execute(text("UPDATE users SET is_verified = TRUE WHERE is_verified IS NULL OR email IN ('admin@opspilot.com', 'manager@opspilot.com', 'operator@opspilot.com');"))
        except Exception:
            pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for providing an isolated async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

