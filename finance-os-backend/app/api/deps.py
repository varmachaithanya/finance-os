import uuid
from typing import Generator

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.core.security import decode_token
from app.models.user import User

security_scheme = HTTPBearer()

_engine = None


def get_engine():
    global _engine
    if _engine is None:
        _engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
    return _engine


def get_db() -> Generator[Session, None, None]:
    engine = get_engine()
    session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = session_local()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
) -> User:
    payload = decode_token(credentials.credentials)
    if payload is None or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    return user
