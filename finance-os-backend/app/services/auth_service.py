import logging
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.services.email_service import (
    send_welcome_email,
    send_login_notification,
    send_password_reset_email,
    send_new_user_notification,
    send_account_deletion_notification,
)

logger = logging.getLogger(__name__)


class AuthService:
    def __init__(self, db: Session):
        self.repo = UserRepository(db)
        self.db = db

    def register(self, email: str, password: str, full_name: str, currency: str = "INR", timezone: str = "Asia/Kolkata") -> User:
        existing = self.repo.get_by_email(email)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )
        user = self.repo.create(
            email=email,
            password_hash=hash_password(password),
            full_name=full_name,
            currency=currency,
            timezone=timezone,
        )
        try:
            send_welcome_email(email, full_name)
            send_new_user_notification(email, full_name)
        except Exception:
            logger.exception("Failed to send welcome email to %s", email)
        return user

    def login(self, email: str, password: str) -> dict:
        user = self.repo.get_by_email(email)
        if not user or not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account is inactive",
            )
        access_token = create_access_token(data={"sub": str(user.id)})
        refresh_token = create_refresh_token(data={"sub": str(user.id)})
        try:
            send_login_notification(email, user.full_name)
        except Exception:
            logger.exception("Failed to send login notification to %s", email)
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
        }

    def refresh(self, refresh_token: str) -> dict:
        payload = decode_token(refresh_token)
        if payload is None or payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token",
            )
        user_id = payload.get("sub")
        user = self.repo.get(user_id)
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive",
            )
        access_token = create_access_token(data={"sub": str(user.id)})
        return {"access_token": access_token, "token_type": "bearer"}

    def get_current_user(self, user_id: str) -> User:
        user = self.repo.get(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        return user

    def update_profile(self, user_id: str, **kwargs) -> User:
        user = self.repo.update(user_id, **kwargs)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        return user

    def delete_account(self, user_id: str) -> None:
        user = self.repo.get(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        email = user.email
        full_name = user.full_name
        self.repo.delete(user_id)
        try:
            send_account_deletion_notification(email, full_name)
        except Exception:
            logger.exception("Failed to send account deletion notification")

    def change_password(self, user_id: str, current_password: str, new_password: str) -> None:
        user = self.repo.get(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        if not verify_password(current_password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect",
            )
        self.repo.update(user_id, password_hash=hash_password(new_password))

    def forgot_password(self, email: str) -> dict:
        user = self.repo.get_by_email(email)
        if not user:
            return {"message": "If the email exists, a reset link has been sent"}
        token = create_access_token(
            data={"sub": str(user.id), "purpose": "password_reset"},
            expires_delta=None,
        )
        try:
            send_password_reset_email(email, user.full_name, token)
        except Exception:
            logger.exception("Failed to send password reset email to %s", email)
        return {"message": "If the email exists, a reset link has been sent"}

    def reset_password(self, token: str, new_password: str) -> None:
        payload = decode_token(token)
        if payload is None or payload.get("purpose") != "password_reset":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired reset token",
            )
        user_id = payload.get("sub")
        user = self.repo.get(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found",
            )
        self.repo.update(user_id, password_hash=hash_password(new_password))
