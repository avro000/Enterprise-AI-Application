"""Authentication & Password Recovery Schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserRegisterRequest(BaseModel):
    email: EmailStr
    name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")
    role: str = Field(default="operator", pattern="^(admin|manager|operator)$")


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: UUID
    email: str
    name: str
    role: str
    is_active: bool
    is_verified: bool = False
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class VerifyRegistrationOTPRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6, pattern="^[0-9]{6}$", description="6-digit numeric OTP")


class ResendOTPRequest(BaseModel):
    email: EmailStr


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6, pattern="^[0-9]{6}$", description="6-digit numeric OTP")


class VerifyOTPResponse(BaseModel):
    reset_token: str
    message: str = "OTP verified successfully. Use this token to reset your password."


class ResetPasswordRequest(BaseModel):
    reset_token: str
    new_password: str = Field(..., min_length=8, description="New password must be at least 8 characters")
