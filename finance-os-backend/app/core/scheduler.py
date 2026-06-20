from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from app.core.config import settings
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

import structlog

logger = structlog.get_logger()
scheduler = AsyncIOScheduler(timezone="Asia/Kolkata")


def get_db_session() -> Session:
    engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
    session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return session_local()


def init_scheduler() -> None:
    if scheduler.running:
        return

    # Daily at 9 AM IST — check all dues, renewals, and budget alerts
    scheduler.add_job(
        func=_run_notification_checks,
        trigger=CronTrigger(hour=9, minute=0, timezone="Asia/Kolkata"),
        id="notification_checks_morning",
        name="Morning notification checks",
        replace_existing=True,
        misfire_grace_time=3600,
    )

    # Daily at 6 PM IST — check dues again (evening reminder)
    scheduler.add_job(
        func=_run_notification_checks,
        trigger=CronTrigger(hour=18, minute=0, timezone="Asia/Kolkata"),
        id="notification_checks_evening",
        name="Evening notification checks",
        replace_existing=True,
        misfire_grace_time=3600,
    )

    # Daily at 8 PM IST — send expense reminder emails
    scheduler.add_job(
        func=_run_daily_reminders,
        trigger=CronTrigger(hour=20, minute=0, timezone="Asia/Kolkata"),
        id="daily_expense_reminder",
        name="Daily expense reminder email at 8 PM",
        replace_existing=True,
        misfire_grace_time=3600,
    )

    scheduler.start()
    logger.info("Scheduler started with 3 jobs: notifications at 9AM + 6PM, email reminder at 8PM IST")


def _run_notification_checks() -> None:
    db = get_db_session()
    try:
        from app.services.notification_service import (
            check_credit_card_dues,
            check_loan_emi_dues,
            check_subscription_renewals,
            check_budget_alerts,
        )
        check_credit_card_dues(db)
        check_loan_emi_dues(db)
        check_subscription_renewals(db)
        check_budget_alerts(db)
        db.commit()
        logger.info("All notification checks completed")
    except Exception as e:
        logger.error(f"Notification check error: {e}")
        db.rollback()
    finally:
        db.close()


def _run_daily_reminders() -> None:
    db = get_db_session()
    try:
        from app.services.notification_service import send_daily_expense_reminders
        send_daily_expense_reminders(db)
        db.commit()
        logger.info("Daily email reminders completed")
    except Exception as e:
        logger.error(f"Daily reminder error: {e}")
        db.rollback()
    finally:
        db.close()


def shutdown_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler stopped")
