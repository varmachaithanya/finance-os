import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    currency: Optional[str] = "INR"
    timezone: Optional[str] = "Asia/Kolkata"

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    phone: Optional[str] = None
    currency: str = "INR"
    timezone: str = "Asia/Kolkata"
    avatar_url: Optional[str] = None
    is_active: bool = True
    created_at: datetime

    model_config = {"from_attributes": True}


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    currency: Optional[str] = None
    timezone: Optional[str] = None
