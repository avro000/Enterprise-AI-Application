"""Authentication Business Logic Service."""

import logging
from typing import Optional, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    decode_token,
    get_password_hash,
    verify_password,
)
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.auth import (
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
)
from app.services.email_service import EmailService
from app.services.email_validator import EmailValidatorService
from app.services.otp_service import OTPService

logger = logging.getLogger("auth_service")


class AuthService:
    """Handles user onboarding, authentication, role verification, and password resets."""

    @staticmethod
    async def register_user(db: AsyncSession, request: UserRegisterRequest) -> User:
        """Registers a new user after verifying unique email address and deliverability."""
        # 1. Enforce real domain existence, MX deliverability, and disposable provider blocking
        EmailValidatorService.validate_email_domain(request.email)

        # 2. Check for duplicate registration
        stmt = select(User).where(User.email == request.email.lower())
        existing = (await db.execute(stmt)).scalars().first()
        if existing:
            raise ValueError("A user with this email address already exists")

        user = User(
            email=request.email.lower(),
            name=request.name.strip(),
            password_hash=get_password_hash(request.password),
            role=request.role,
            is_active=True,
            is_verified=False,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

        # 3. Generate 6-digit registration OTP valid for 5 minutes and dispatch to email
        _, raw_otp = await OTPService.create_otp(db, user, purpose="registration")
        try:
            await EmailService.send_otp_email(user.email, user.name, raw_otp, purpose="registration")
        except Exception as e:
            logger.warning(f"Failed to dispatch registration OTP email: {e}")

        # Audit log entry
        audit = AuditLog(
            event_type="user_registered",
            actor_type="system",
            actor_id=user.id,
            entity_type="user",
            entity_id=user.id,
            details={"email": user.email, "role": user.role, "requires_verification": True},
        )
        db.add(audit)
        await db.commit()

        return user

    @staticmethod
    async def verify_registration_otp(
        db: AsyncSession,
        email: str,
        otp: str,
    ) -> Tuple[bool, Optional[str]]:
        """Verifies 6-digit registration OTP code and activates user account."""
        stmt = select(User).where(User.email == email.lower())
        user = (await db.execute(stmt)).scalars().first()
        if not user:
            return False, "No account found registered with this email address"

        if user.is_verified:
            return True, "Account is already verified. You may log in directly."

        success, _, error_msg = await OTPService.verify_otp(db, user, otp, purpose="registration")
        if not success:
            return False, error_msg or "Invalid or expired verification code"

        user.is_verified = True
        user.is_active = True

        audit = AuditLog(
            event_type="user_email_verified",
            actor_type="user",
            actor_id=user.id,
            entity_type="user",
            entity_id=user.id,
            details={"email": user.email},
        )
        db.add(audit)
        await db.commit()
        return True, None

    @staticmethod
    async def resend_registration_otp(db: AsyncSession, email: str) -> bool:
        """Dispatches a fresh 6-digit registration activation OTP valid for 5 minutes."""
        stmt = select(User).where(User.email == email.lower())
        user = (await db.execute(stmt)).scalars().first()
        if not user:
            raise ValueError(f"No account found registered with email '{email}'.")

        if user.is_verified:
            raise ValueError("Account is already verified. You may log in directly.")

        _, raw_otp = await OTPService.create_otp(db, user, purpose="registration")
        success, err = await EmailService.send_otp_email(user.email, user.name, raw_otp, purpose="registration")
        if not success:
            raise RuntimeError(f"Email delivery failed via SMTP: {err}")

        audit = AuditLog(
            event_type="otp_requested",
            actor_type="user",
            actor_id=user.id,
            entity_type="user",
            entity_id=user.id,
            details={"purpose": "registration", "email": user.email},
        )
        db.add(audit)
        await db.commit()
        return True

    @staticmethod
    async def authenticate_user(db: AsyncSession, request: UserLoginRequest) -> TokenResponse:
        """Authenticates user credentials and returns JWT Bearer token after checking verification."""
        stmt = select(User).where(User.email == request.email.lower())
        user = (await db.execute(stmt)).scalars().first()

        if not user or not verify_password(request.password, user.password_hash):
            raise ValueError("Invalid email or password")

        if not user.is_verified:
            raise PermissionError(
                "Your account has not been verified. Please enter the 6-digit verification code sent to your email to activate your account."
            )

        if not user.is_active:
            raise PermissionError("Account has been deactivated. Please contact an administrator.")

        access_token = create_access_token(data={"sub": str(user.id), "role": user.role, "email": user.email})

        # Audit log login
        audit = AuditLog(
            event_type="user_logged_in",
            actor_type="user",
            actor_id=user.id,
            entity_type="user",
            entity_id=user.id,
            details={"email": user.email},
        )
        db.add(audit)
        await db.commit()

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse.model_validate(user),
        )

    @staticmethod
    async def request_password_reset(db: AsyncSession, email: str) -> str:
        """Generates a secure OTP code and dispatches via email."""
        stmt = select(User).where(User.email == email.lower())
        user = (await db.execute(stmt)).scalars().first()

        if not user or not user.is_active:
            logger.info(f"Password reset requested for non-existent or inactive email: {email}")
            raise ValueError(f"No active account found registered with email '{email}'.")

        _, raw_otp = await OTPService.create_otp(db, user, purpose="password_reset")
        success, err = await EmailService.send_otp_email(user.email, user.name, raw_otp)
        if not success:
            raise RuntimeError(f"Email delivery failed via SMTP: {err}")

        audit = AuditLog(
            event_type="otp_requested",
            actor_type="user",
            actor_id=user.id,
            entity_type="user",
            entity_id=user.id,
            details={"purpose": "password_reset", "email": user.email},
        )
        db.add(audit)
        await db.commit()
        return raw_otp

    @staticmethod
    async def verify_password_reset_otp(
        db: AsyncSession,
        email: str,
        otp: str,
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """Verifies OTP and issues temporary password-reset token."""
        stmt = select(User).where(User.email == email.lower())
        user = (await db.execute(stmt)).scalars().first()

        if not user:
            return False, None, "Invalid email or verification code"

        success, reset_token, error_msg = await OTPService.verify_otp(db, user, otp, purpose="password_reset")
        if success:
            audit = AuditLog(
                event_type="otp_verified",
                actor_type="user",
                actor_id=user.id,
                entity_type="user",
                entity_id=user.id,
                details={"purpose": "password_reset"},
            )
            db.add(audit)
            await db.commit()

        return success, reset_token, error_msg

    @staticmethod
    async def reset_password_with_token(
        db: AsyncSession,
        reset_token: str,
        new_password: str,
    ) -> bool:
        """Consumes a temporary reset token and updates the user password."""
        payload = decode_token(reset_token)
        if not payload or payload.get("purpose") != "password_reset":
            raise ValueError("Invalid or expired password reset token")

        user_id_str = payload.get("sub")
        stmt = select(User).where(User.id == user_id_str)
        user = (await db.execute(stmt)).scalars().first()

        if not user or not user.is_active:
            raise ValueError("User associated with this reset token not found or inactive")

        user.password_hash = get_password_hash(new_password)
        await db.commit()

        audit = AuditLog(
            event_type="password_reset_completed",
            actor_type="user",
            actor_id=user.id,
            entity_type="user",
            entity_id=user.id,
            details={"email": user.email},
        )
        db.add(audit)
        await db.commit()

        return True
