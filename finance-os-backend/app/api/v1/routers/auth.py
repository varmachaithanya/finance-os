import traceback
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UpdateProfileRequest,
    UserResponse,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", summary="Register a new user")
def register(body: RegisterRequest, db: Session = Depends(get_db)) -> UserResponse:
    print("=== REGISTER DEBUG ===", flush=True)
    print(f"Email: {body.email}, Full name: {body.full_name}", flush=True)
    try:
        service = AuthService(db)
        user = service.register(
            email=body.email,
            password=body.password,
            full_name=body.full_name,
            currency=body.currency,
            timezone=body.timezone,
        )
        print(f"User created: id={user.id}, type={type(user.id)}", flush=True)
        result = UserResponse.model_validate(user)
        print(f"Model validated: id={result.id}", flush=True)
        return result
    except Exception as e:
        print(f"REGISTER ERROR: {type(e).__name__}: {e}", flush=True)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")


@router.post("/login", summary="Login and get tokens", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> dict:
    service = AuthService(db)
    return service.login(email=body.email, password=body.password)


@router.post("/refresh", summary="Refresh access token")
def refresh(body: RefreshRequest, db: Session = Depends(get_db)) -> dict:
    service = AuthService(db)
    return service.refresh(refresh_token=body.refresh_token)


@router.post("/logout", summary="Logout (invalidate refresh token)")
def logout(body: RefreshRequest) -> dict:
    return {"message": "Logged out successfully"}


@router.post("/forgot-password", summary="Request password reset")
def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)) -> dict:
    service = AuthService(db)
    return service.forgot_password(email=body.email)


@router.post("/reset-password", summary="Reset password with token")
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)) -> dict:
    service = AuthService(db)
    service.reset_password(token=body.token, new_password=body.new_password)
    return {"message": "Password reset successfully"}


@router.get("/me", summary="Get current user profile", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.put("/me", summary="Update current user profile", response_model=UserResponse)
def update_me(
    body: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    service = AuthService(db)
    kwargs = body.model_dump(exclude_none=True)
    user = service.update_profile(str(current_user.id), **kwargs)
    return UserResponse.model_validate(user)


@router.post("/change-password", summary="Change password")
def change_password(
    body: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    service = AuthService(db)
    service.change_password(
        user_id=str(current_user.id),
        current_password=body.current_password,
        new_password=body.new_password,
    )
    return {"message": "Password changed successfully"}
