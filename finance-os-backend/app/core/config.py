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

    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = ""
    EMAIL_FROM_NAME: str = "WealthWise"

    RESEND_API_KEY: str = ""

    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    GOOGLE_REDIRECT_URI: str = os.getenv(
        "GOOGLE_REDIRECT_URI",
        "https://financeos-api-production-8d74.up.railway.app/api/v1/gmail/callback"
    )

    # Alternate email config style (same as SMTP_* above, for compatibility)
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = ""
    MAIL_FROM_NAME: str = "WealthWise"
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_PORT: int = 587
    MAIL_STARTTLS: bool = True
    MAIL_SSL_TLS: bool = False

    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "rule")

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
