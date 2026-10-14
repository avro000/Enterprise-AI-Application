"""Cryptographic OTP Management Service for Production-Grade Security."""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.security import create_reset_token
from app.models.otp_code import OTPCode
from app.models.user import User


class OTPService:
    """Manages secure generation, hashing, rate limiting, and verification of OTPs."""

    @staticmethod
    def _generate_numeric_otp(length: int = 6) -> str:
        """Generates a cryptographically strong random N-digit code."""
        return "".join(secrets.choice("0123456789") for _ in range(length))

    @staticmethod
    def _hash_otp(otp: str, user_id: str) -> str:
        """Computes SHA-256 hash of OTP salted with user UUID to prevent rainbow table attacks."""
        salt = f"{user_id}:{settings.JWT_SECRET_KEY[:16]}"
        return hashlib.sha256(f"{salt}:{otp}".encode("utf-8")).hexdigest()

    @classmethod
    async def create_otp(
        cls,
        db: AsyncSession,
        user: User,
        purpose: str = "password_reset",
    ) -> Tuple[OTPCode, str]:
        """Invalidates old OTPs and generates a new secure hashed OTP."""
        # 1. Invalidate any existing unused OTPs for this user and purpose
        stmt = select(OTPCode).where(
            and_(
                OTPCode.user_id == user.id,
                OTPCode.purpose == purpose,
                OTPCode.is_used == False,
            )
        )
        result = await db.execute(stmt)
        existing_otps = result.scalars().all()
        for old_otp in existing_otps:
            old_otp.is_used = True

        # 2. Generate raw 6-digit OTP
        raw_otp = cls._generate_numeric_otp(6)
        hashed_otp = cls._hash_otp(raw_otp, str(user.id))

        # 3. Create record with expiry
        expiry = datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)
        otp_record = OTPCode(
            user_id=user.id,
            otp_hash=hashed_otp,
            purpose=purpose,
            expires_at=expiry,
            attempts=0,
            is_used=False,
        )
        db.add(otp_record)
        await db.commit()
        await db.refresh(otp_record)

        return otp_record, raw_otp

    @classmethod
    async def verify_otp(
        cls,
        db: AsyncSession,
        user: User,
        input_otp: str,
        purpose: str = "password_reset",
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """Verifies input OTP against stored hash.

        Returns: (success: bool, reset_token_or_none, error_message_or_none)
        """
        now = datetime.now(timezone.utc)
        
        # Query most recent unused OTP for this user
        stmt = (
            select(OTPCode)
            .where(
                and_(
                    OTPCode.user_id == user.id,
                    OTPCode.purpose == purpose,
                    OTPCode.is_used == False,
                )
            )
            .order_by(OTPCode.created_at.desc())
        )
        result = await db.execute(stmt)
        otp_record = result.scalars().first()

        if not otp_record:
            return False, None, "No active verification code found. Please request a new code."

        # Check maximum rate-limiting attempts
        if otp_record.attempts >= settings.OTP_MAX_ATTEMPTS:
            otp_record.is_used = True
            await db.commit()
            return False, None, "Too many incorrect attempts. For security, this code has been revoked. Please request a new code."

        # Check expiration
        # Ensure comparison is timezone-aware
        record_expiry = otp_record.expires_at
        if record_expiry.tzinfo is None:
            record_expiry = record_expiry.replace(tzinfo=timezone.utc)

        if now > record_expiry:
            otp_record.is_used = True
            await db.commit()
            return False, None, "Verification code has expired. Please request a new code."

        # Check hash match
        expected_hash = cls._hash_otp(input_otp, str(user.id))
        if not secrets.compare_digest(otp_record.otp_hash, expected_hash):
            otp_record.attempts += 1
            await db.commit()
            remaining = settings.OTP_MAX_ATTEMPTS - otp_record.attempts
            return False, None, f"Invalid verification code. {remaining} attempt(s) remaining."

        # Successful verification! Mark used
        otp_record.is_used = True
        await db.commit()

        reset_token = create_reset_token(str(user.id)) if purpose == "password_reset" else None
        return True, reset_token, None
