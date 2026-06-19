import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-key")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    DEFAULT_CURRENCY: str = "INR"
    REPORTS_DIR: str = "./reports"
    AVATARS_DIR: str = "./avatars"
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "")

    WEBAUTHN_RP_ID: str = os.getenv("WEBAUTHN_RP_ID", "localhost")
    WEBAUTHN_ORIGIN: str = os.getenv("WEBAUTHN_ORIGIN", "http://localhost:5173")
    WEBAUTHN_RP_NAME: str = os.getenv("WEBAUTHN_RP_NAME", "WealthWise")

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
