from datetime import date, timedelta
from decimal import Decimal

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.models.notification import Notification
from app.services.email_service import (
    send_budget_alert,
    send_cc_due_reminder,
    send_subscription_renewal_notification,
)

scheduler = AsyncIOScheduler()


def get_db_session() -> Session:
    engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
    session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return session_local()


def check_credit_card_due():
    db = get_db_session()
    try:
        from app.models.credit_card import CreditCard
        from app.models.user import User
        today = date.today()
        future = today + timedelta(days=7)
        cards = db.query(CreditCard).filter(
            CreditCard.is_active == True,
            CreditCard.due_date >= today,
            CreditCard.due_date <= future,
        ).all()
        for card in cards:
            days_left = (card.due_date - today).days if card.due_date else 0
            existing = db.query(Notification).filter(
                Notification.user_id == card.user_id,
                Notification.type == "credit_card_due",
                Notification.entity_id == card.id,
                Notification.is_read == False,
            ).first()
            if not existing:
                db.add(Notification(
                    user_id=card.user_id,
                    type="credit_card_due",
                    title=f"Credit Card Due in {days_left} days",
                    message=f"{card.bank_name} - {card.card_name} minimum payment of ₹{card.minimum_due} is due on {card.due_date}",
                    entity_type="credit_card",
                    entity_id=card.id,
                ))
                user = db.query(User).filter(User.id == card.user_id).first()
                if user:
                    try:
                        send_cc_due_reminder(
                            recipient=user.email,
                            bank_name=card.bank_name,
                            card_name=card.card_name,
                            minimum_due=str(card.minimum_due),
                            due_date=str(card.due_date),
                            days_left=days_left,
                        )
                    except Exception:
                        import logging
                        logging.getLogger(__name__).exception(
                            "Failed to send CC due email to %s", user.email
                        )
        db.commit()
    finally:
        db.close()


def check_loan_emi_due():
    db = get_db_session()
    try:
        from app.models.debt import Debt
        from app.models.user import User
        today = date.today()
        future = today + timedelta(days=7)
        debts = db.query(Debt).filter(
            Debt.status == "active",
            Debt.due_date >= today,
            Debt.due_date <= future,
        ).all()
        for debt in debts:
            days_left = (debt.due_date - today).days if debt.due_date else 0
            existing = db.query(Notification).filter(
                Notification.user_id == debt.user_id,
                Notification.type == "loan_emi_due",
                Notification.entity_id == debt.id,
                Notification.is_read == False,
            ).first()
            if not existing:
                db.add(Notification(
                    user_id=debt.user_id,
                    type="loan_emi_due",
                    title=f"Loan EMI Due in {days_left} days",
                    message=f"{debt.lender_name} EMI of ₹{debt.emi_amount or 'N/A'} is due on {debt.due_date}",
                    entity_type="debt",
                    entity_id=debt.id,
                ))
        db.commit()
    finally:
        db.close()


def check_subscription_renewals():
    db = get_db_session()
    try:
        from app.models.subscription import Subscription
        from app.models.user import User
        today = date.today()
        future = today + timedelta(days=7)
        subs = db.query(Subscription).filter(
            Subscription.is_active == True,
            Subscription.renewal_date >= today,
            Subscription.renewal_date <= future,
        ).all()
        for sub in subs:
            days_left = (sub.renewal_date - today).days if sub.renewal_date else 0
            existing = db.query(Notification).filter(
                Notification.user_id == sub.user_id,
                Notification.type == "subscription_renewal",
                Notification.entity_id == sub.id,
                Notification.is_read == False,
            ).first()
            if not existing:
                db.add(Notification(
                    user_id=sub.user_id,
                    type="subscription_renewal",
                    title=f"Subscription Renewal in {days_left} days",
                    message=f"{sub.service_name} of ₹{sub.amount} will renew on {sub.renewal_date}",
                    entity_type="subscription",
                    entity_id=sub.id,
                ))
                user = db.query(User).filter(User.id == sub.user_id).first()
                if user:
                    try:
                        send_subscription_renewal_notification(
                            recipient=user.email,
                            service_name=sub.service_name,
                            amount=str(sub.amount),
                            renewal_date=str(sub.renewal_date),
                            days_left=days_left,
                        )
                    except Exception:
                        import logging
                        logging.getLogger(__name__).exception(
                            "Failed to send renewal email to %s", user.email
                        )
        db.commit()
    finally:
        db.close()


def check_budget_alerts():
    db = get_db_session()
    try:
        today = date.today()
        from app.models.budget import Budget
        from app.models.expense import Expense
        from app.models.category import Category
        from app.models.user import User
        from sqlalchemy import extract, func

        budgets = (
            db.query(
                Budget.user_id,
                Budget.category_id,
                Category.name.label("category_name"),
                Budget.budget_amount,
                func.coalesce(func.sum(Expense.amount), 0).label("spent"),
            )
            .join(Category, Category.id == Budget.category_id)
            .outerjoin(
                Expense,
                (Expense.category_id == Budget.category_id)
                & (Expense.user_id == Budget.user_id)
                & (extract("month", Expense.expense_date) == today.month)
                & (extract("year", Expense.expense_date) == today.year),
            )
            .filter(
                Budget.month == today.month,
                Budget.year == today.year,
            )
            .group_by(Budget.user_id, Budget.category_id, Category.name, Budget.budget_amount)
            .having(
                (func.coalesce(func.sum(Expense.amount), 0) / Budget.budget_amount) > 0.8
            )
            .all()
        )

        for b in budgets:
            pct = float(b.spent) / float(b.budget_amount) * 100
            existing = db.query(Notification).filter(
                Notification.user_id == b.user_id,
                Notification.type == "budget_alert",
                Notification.entity_id == b.category_id,
                Notification.is_read == False,
            ).first()
            if not existing:
                db.add(Notification(
                    user_id=b.user_id,
                    type="budget_alert",
                    title=f"Budget Alert: {b.category_name}",
                    message=f"You've used {pct:.1f}% of your {b.category_name} budget (₹{b.spent} of ₹{b.budget_amount})",
                    entity_type="budget",
                    entity_id=b.category_id,
                ))
                user = db.query(User).filter(User.id == b.user_id).first()
                if user:
                    try:
                        send_budget_alert(
                            recipient=user.email,
                            category_name=b.category_name,
                            spent=str(b.spent),
                            budget_amount=str(b.budget_amount),
                            pct=pct,
                        )
                    except Exception:
                        import logging
                        logging.getLogger(__name__).exception(
                            "Failed to send budget alert email to %s", user.email
                        )
        db.commit()
    finally:
        db.close()


def init_scheduler() -> None:
    if scheduler.running:
        return
    scheduler.add_job(check_credit_card_due, "cron", hour=9, minute=0, id="credit_card_due")
    scheduler.add_job(check_loan_emi_due, "cron", hour=9, minute=0, id="loan_emi_due")
    scheduler.add_job(check_subscription_renewals, "cron", hour=9, minute=0, id="subscription_renewals")
    scheduler.add_job(check_budget_alerts, "cron", hour=10, minute=0, id="budget_alerts")
    scheduler.start()
