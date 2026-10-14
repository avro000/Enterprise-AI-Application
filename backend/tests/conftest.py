"""Pytest fixtures and test client configuration."""

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from app.core.security import create_access_token
from app.database import init_db
from app.main import app


@pytest_asyncio.fixture(scope="session", autouse=True)
async def prepare_db():
    """Ensure database schema is created and default test users exist."""
    await init_db()
    from app.database import async_session_maker
    from app.models.user import User
    from app.core.security import get_password_hash
    from sqlalchemy import select

    test_users = [
        {"email": "admin@opspilot.com", "role": "admin", "full_name": "Admin User", "password": "Admin@123456"},
        {"email": "manager@opspilot.com", "role": "manager", "full_name": "Manager User", "password": "Manager@123456"},
        {"email": "operator@opspilot.com", "role": "operator", "full_name": "Operator User", "password": "Operator@123456"},
    ]
    async with async_session_maker() as session:
        for u in test_users:
            existing = (await session.execute(select(User).where(User.email == u["email"]))).scalars().first()
            if not existing:
                new_u = User(
                    email=u["email"],
                    hashed_password=get_password_hash(u["password"]),
                    full_name=u["full_name"],
                    role=u["role"],
                    is_active=True,
                )
                session.add(new_u)
        await session.commit()
    yield


@pytest.fixture(autouse=True)
def mock_smtp(monkeypatch):
    """Bypasses real SMTP outbound calls during test execution."""
    from app.services.email_service import EmailService

    async def fake_send(to_email, user_name, otp_code, *args, **kwargs):
        return True, None

    monkeypatch.setattr(EmailService, "send_otp_email", fake_send)


@pytest_asyncio.fixture
async def client():
    """Async HTTP test client fixture."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def admin_headers():
    """Authorization headers for admin role."""
    from app.database import async_session_maker
    from app.models.user import User
    from sqlalchemy import select

    async with async_session_maker() as session:
        user = (await session.execute(select(User).where(User.email == "admin@opspilot.com"))).scalars().first()
        token = create_access_token(data={"sub": str(user.id), "role": user.role, "email": user.email})
        return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def manager_headers():
    """Authorization headers for manager role."""
    from app.database import async_session_maker
    from app.models.user import User
    from sqlalchemy import select

    async with async_session_maker() as session:
        user = (await session.execute(select(User).where(User.email == "manager@opspilot.com"))).scalars().first()
        token = create_access_token(data={"sub": str(user.id), "role": user.role, "email": user.email})
        return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def operator_headers():
    """Authorization headers for operator role."""
    from app.database import async_session_maker
    from app.models.user import User
    from sqlalchemy import select

    async with async_session_maker() as session:
        user = (await session.execute(select(User).where(User.email == "operator@opspilot.com"))).scalars().first()
        token = create_access_token(data={"sub": str(user.id), "role": user.role, "email": user.email})
        return {"Authorization": f"Bearer {token}"}


