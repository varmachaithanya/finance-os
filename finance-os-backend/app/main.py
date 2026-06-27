import os
import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.staticfiles import StaticFiles

from app.api.v1.routers import auth, categories, expenses, income, credit_cards, debts, subscriptions, budgets, dashboard, reports, notifications, webauthn, insights, gmail
from app.core.config import settings
from app.core.logging import setup_logging
from app.core.scheduler import init_scheduler, shutdown_scheduler

import structlog
setup_logging()
logger = structlog.get_logger()


class SafeStaticFiles(StaticFiles):
    def __init__(self, *args, **kwargs):
        directory = kwargs.get("directory")
        if directory and not os.path.exists(directory):
            os.makedirs(directory, exist_ok=True)
            logger.warning("created_missing_directory", path=str(directory))
        super().__init__(*args, **kwargs)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        os.makedirs(settings.REPORTS_DIR, exist_ok=True)
        os.makedirs(settings.AVATARS_DIR, exist_ok=True)
        logger.info("directories_ready", avatars_dir=str(settings.AVATARS_DIR), reports_dir=str(settings.REPORTS_DIR))
        from app.setup_db import init_db
        init_db()

        from sqlalchemy import text as sa_text
        from app.core.database import engine
        with engine.connect() as conn:
            conn.execute(sa_text("""
                CREATE TABLE IF NOT EXISTS gmail_tokens (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id UUID REFERENCES users(id)
                        ON DELETE CASCADE,
                    access_token TEXT,
                    refresh_token TEXT,
                    token_expiry TIMESTAMP,
                    is_connected BOOLEAN DEFAULT TRUE,
                    last_fetched_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW(),
                    UNIQUE(user_id)
                )
            """))
            conn.execute(sa_text("""
                ALTER TABLE gmail_tokens
                ADD COLUMN IF NOT EXISTS
                last_fetched_at TIMESTAMP
            """))
            conn.commit()
        logger.info("gmail_tokens table ready")

        init_scheduler()
        logger.info("database_initialized")
    except Exception as e:
        logger.warning("startup_warning", error=str(e))
    yield
    shutdown_scheduler()


app = FastAPI(
    title="WealthWise API",
    description="Personal Finance & Expense Tracking Application",
    version="1.0.0",
    lifespan=lifespan,
)

allow_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://financeos-ui-production.up.railway.app",
]

frontend_url = os.getenv("FRONTEND_URL", "")
if frontend_url and frontend_url not in allow_origins:
    allow_origins.append(frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    tb = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
    print(f"UNHANDLED ERROR [{request.method} {request.url.path}]: {tb}", flush=True)
    logger.error("Unhandled exception", path=request.url.path, method=request.method, error=str(exc))
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}", "code": "INTERNAL_ERROR"},
    )


app.mount("/api/v1/avatars", SafeStaticFiles(directory=settings.AVATARS_DIR), name="avatars")

app.include_router(auth.router, prefix="/api/v1")
app.include_router(categories.router, prefix="/api/v1")
app.include_router(expenses.router, prefix="/api/v1")
app.include_router(income.router, prefix="/api/v1")
app.include_router(credit_cards.router, prefix="/api/v1")
app.include_router(debts.router, prefix="/api/v1")
app.include_router(subscriptions.router, prefix="/api/v1")
app.include_router(budgets.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")
app.include_router(webauthn.router, prefix="/api/v1")
app.include_router(insights.router, prefix="/api/v1")
app.include_router(gmail.router, prefix="/api/v1/gmail", tags=["Gmail"])
