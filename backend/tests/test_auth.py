"""Authentication & Password Recovery Tests."""

import pytest
from app.database import async_session_maker
from app.models.user import User
from app.services.otp_service import OTPService
from sqlalchemy import select


@pytest.mark.asyncio
async def test_register_and_login_flow(client):
    """Test full user registration and subsequent login."""
    import uuid
    unique_email = f"test.op.{uuid.uuid4().hex[:8]}@opspilot.com"
    reg_payload = {
        "email": unique_email,
        "name": "Test Operator",
        "password": "SecurePassword123",
        "role": "operator",
    }
    # 1. Register
    reg_resp = await client.post("/api/auth/register", json=reg_payload)
    assert reg_resp.status_code == 201
    reg_data = reg_resp.json()
    assert reg_data["email"] == unique_email
    assert reg_data["role"] == "operator"
    assert reg_data["is_verified"] is False

    # 2. Duplicate registration fails
    dup_resp = await client.post("/api/auth/register", json=reg_payload)
    assert dup_resp.status_code == 400
    assert "already exists" in dup_resp.json()["detail"]

    # 3. Login BEFORE verifying registration OTP fails with 403 Forbidden
    unverified_login = await client.post(
        "/api/auth/login",
        json={"email": unique_email, "password": "SecurePassword123"},
    )
    assert unverified_login.status_code == 403
    assert "not been verified" in unverified_login.json()["detail"]

    # 4. Verify with wrong OTP fails
    bad_otp_resp = await client.post(
        "/api/auth/verify-registration-otp",
        json={"email": unique_email, "otp": "000000"},
    )
    assert bad_otp_resp.status_code == 400

    # 5. Extract generated OTP from DB and verify successfully
    async with async_session_maker() as session:
        user = (await session.execute(select(User).where(User.email == unique_email))).scalars().first()
        _, raw_otp = await OTPService.create_otp(session, user, purpose="registration")

    verify_resp = await client.post(
        "/api/auth/verify-registration-otp",
        json={"email": unique_email, "otp": raw_otp},
    )
    assert verify_resp.status_code == 200
    assert "activated" in verify_resp.json()["message"].lower()

    # 6. Login with wrong password fails with 401
    bad_login = await client.post(
        "/api/auth/login",
        json={"email": unique_email, "password": "WrongPassword"},
    )
    assert bad_login.status_code == 401

    # 7. Login with correct credentials now succeeds with 200 OK
    login_resp = await client.post(
        "/api/auth/login",
        json={"email": unique_email, "password": "SecurePassword123"},
    )
    assert login_resp.status_code == 200
    token_data = login_resp.json()
    assert "access_token" in token_data
    token = token_data["access_token"]

    # 8. Access /api/auth/me with Bearer token
    me_resp = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["email"] == unique_email
    assert me_data["is_verified"] is True



@pytest.mark.asyncio
async def test_auth_me_unauthorized(client):
    """Accessing /api/auth/me without valid token returns 401."""
    resp = await client.get("/api/auth/me")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_forgot_password_otp_recovery_flow(client):
    """Test forgot-password OTP generation, verification, and password reset."""
    # 1a. Trigger forgot password with unregistered email fails with 404
    bad_email_resp = await client.post(
        "/api/auth/forgot-password",
        json={"email": "nonexistent_user_999@opspilot.com"},
    )
    assert bad_email_resp.status_code == 404
    assert "No active account found" in bad_email_resp.json()["detail"]

    # 1b. Trigger forgot password with valid email succeeds
    fp_resp = await client.post(
        "/api/auth/forgot-password",
        json={"email": "admin@opspilot.com"},
    )
    assert fp_resp.status_code == 200

    # 2. Extract generated OTP directly from service for testing
    async with async_session_maker() as session:
        stmt = select(User).where(User.email == "admin@opspilot.com")
        user = (await session.execute(stmt)).scalars().first()
        assert user is not None
        _, raw_otp = await OTPService.create_otp(session, user, purpose="password_reset")

    # 3. Test invalid OTP rejection
    bad_verify = await client.post(
        "/api/auth/verify-otp",
        json={"email": "admin@opspilot.com", "otp": "000000"},
    )
    assert bad_verify.status_code == 400

    # 4. Verify with correct OTP
    verify_resp = await client.post(
        "/api/auth/verify-otp",
        json={"email": "admin@opspilot.com", "otp": raw_otp},
    )
    assert verify_resp.status_code == 200
    reset_data = verify_resp.json()
    assert "reset_token" in reset_data
    reset_token = reset_data["reset_token"]

    # 5. Complete password reset
    reset_resp = await client.post(
        "/api/auth/reset-password",
        json={"reset_token": reset_token, "new_password": "NewAdminPassword!99"},
    )
    assert reset_resp.status_code == 200

    # 6. Login with new password
    new_login = await client.post(
        "/api/auth/login",
        json={"email": "admin@opspilot.com", "password": "NewAdminPassword!99"},
    )
    assert new_login.status_code == 200

    # Reset back to Admin@123456 so other tests remain predictable
    from app.core.security import get_password_hash
    async with async_session_maker() as session:
        stmt = select(User).where(User.email == "admin@opspilot.com")
        u = (await session.execute(stmt)).scalars().first()
        u.password_hash = get_password_hash("Admin@123456")
        await session.commit()


@pytest.mark.asyncio
async def test_register_fake_email_domain_rejected(client):
    """Verifies that non-existent domains without MX records are rejected."""
    bad_payload = {
        "email": "OwaQXzfJVwg0@lxJycmzVbXzSd.pb",
        "name": "Fake User",
        "password": "SecurePassword123",
        "role": "operator",
    }
    resp = await client.post("/api/auth/register", json=bad_payload)
    assert resp.status_code == 400
    assert "does not exist" in resp.json()["detail"].lower() or "invalid" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_register_disposable_email_rejected(client):
    """Verifies that disposable temporary email providers are rejected."""
    disposable_payload = {
        "email": "tempuser@mailinator.com",
        "name": "Disposable User",
        "password": "SecurePassword123",
        "role": "operator",
    }
    resp = await client.post("/api/auth/register", json=disposable_payload)
    assert resp.status_code == 400
    assert "disposable" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_resend_registration_otp(client):
    """Verifies resending 5-minute registration OTP."""
    import uuid
    email = f"resend.test.{uuid.uuid4().hex[:6]}@opspilot.com"
    # Register user
    reg = await client.post("/api/auth/register", json={
        "email": email,
        "name": "Resend Tester",
        "password": "SecurePassword123",
        "role": "operator"
    })
    assert reg.status_code == 201

    # Resend OTP
    resend = await client.post("/api/auth/resend-registration-otp", json={"email": email})
    assert resend.status_code == 200
    assert "5 minutes" in resend.json()["message"]



