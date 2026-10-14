"""Authentication API Routes."""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
    VerifyOTPRequest,
    VerifyOTPResponse,
    VerifyRegistrationOTPRequest,
    ResendOTPRequest,
)
from app.schemas.common import MessageResponse
from app.services.auth_service import AuthService

logger = logging.getLogger("api_auth")

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(request: UserRegisterRequest, db: AsyncSession = Depends(get_db)):
    """User registration endpoint for onboarding operators, managers, or admins. Dispatches 5-minute OTP."""
    try:
        user = await AuthService.register_user(db, request)
        return user
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Registration failed")


@router.post("/verify-registration-otp", response_model=MessageResponse)
async def verify_registration_otp(
    request: VerifyRegistrationOTPRequest,
    db: AsyncSession = Depends(get_db),
):
    """Verifies a 6-digit registration OTP code to activate the user account for login."""
    success, error_msg = await AuthService.verify_registration_otp(db, request.email, request.otp)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_msg or "Invalid or expired verification code")
    return MessageResponse(
        message="Account successfully verified and activated. You may now log in with your credentials."
    )


@router.post("/resend-registration-otp", response_model=MessageResponse)
async def resend_registration_otp(
    request: ResendOTPRequest,
    db: AsyncSession = Depends(get_db),
):
    """Dispatches a fresh 6-digit registration activation OTP valid for 5 minutes."""
    try:
        await AuthService.resend_registration_otp(db, request.email)
        return MessageResponse(
            message=f"Verification code has been successfully resent to {request.email}. Valid for 5 minutes."
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))
    except Exception as e:
        logger.error(f"Resend registration OTP error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to resend verification code")



@router.post("/login", response_model=TokenResponse)
async def login(request: UserLoginRequest, db: AsyncSession = Depends(get_db)):
    """User authentication endpoint returning JWT Bearer token."""
    try:
        token_resp = await AuthService.authenticate_user(db, request)
        return token_resp
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Authentication failed")


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Retrieve profile and role information for currently authenticated user."""
    return current_user


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(request: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Initiates password recovery by generating and dispatching a secure 6-digit OTP."""
    try:
        await AuthService.request_password_reset(db, request.email)
        return MessageResponse(
            message=f"Verification code has been successfully dispatched to {request.email}."
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e))
    except Exception as e:
        logger.error(f"Forgot password error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process password reset request: {str(e)}",
        )


@router.post("/verify-otp", response_model=VerifyOTPResponse)
async def verify_otp(request: VerifyOTPRequest, db: AsyncSession = Depends(get_db)):
    """Verifies a 6-digit OTP code and returns a signed single-use reset token."""
    success, reset_token, error_msg = await AuthService.verify_password_reset_otp(
        db, request.email, request.otp
    )
    if not success or not reset_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg or "Invalid or expired verification code",
        )
    return VerifyOTPResponse(reset_token=reset_token)


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(request: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Consumes a valid reset token to update the user account password."""
    try:
        await AuthService.reset_password_with_token(db, request.reset_token, request.new_password)
        return MessageResponse(
            message="Password has been successfully updated. You may now log in with your new credentials."
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Password reset error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Password reset failed")





