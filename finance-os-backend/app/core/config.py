from pydantic_settings import BaseSettings
from typing import ClassVar


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://financeosuser:financeospass@localhost:5432/financeosdb"
    SECRET_KEY: str = "change-this-to-a-long-random-string-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    REPORTS_DIR: str = "./reports"
    DEFAULT_CURRENCY: str = "INR"
    DEFAULT_TIMEZONE: str = "Asia/Kolkata"

    # Email / SMTP
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 1025
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAIL_FROM: str = "noreply@WealthWise.com"
    EMAIL_FROM_NAME: str = "WealthWise"

    # Frontend URL (used in password reset links)
    FRONTEND_URL: str = "http://localhost:5173"

    model_config = {"env_file": ".env", "case_sensitive": True}


settings = Settings()
