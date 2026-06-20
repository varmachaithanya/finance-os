from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.repositories.base import BaseRepository, to_uuid


class NotificationRepository(BaseRepository[Notification]):
    def __init__(self, db: Session):
        super().__init__(Notification, db)

    def get_by_user(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 50,
        is_read: Optional[bool] = None,
        type: Optional[str] = None,
    ) -> tuple[list[Notification], int]:
        query = self.db.query(Notification).filter(Notification.user_id == to_uuid(user_id))
        if is_read is not None:
            query = query.filter(Notification.is_read == is_read)
        if type:
            query = query.filter(Notification.type == type)
        total = query.count()
        items = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()
        return items, total

    def get_unread_count(self, user_id: str) -> int:
        return (
            self.db.query(Notification)
            .filter(Notification.user_id == to_uuid(user_id), Notification.is_read == False)
            .count()
        )

    def mark_read(self, id: str, user_id: str) -> Optional[Notification]:
        notif = self.db.query(Notification).filter(
            Notification.id == to_uuid(id), Notification.user_id == to_uuid(user_id)
        ).first()
        if not notif:
            return None
        notif.is_read = True
        self.db.commit()
        self.db.refresh(notif)
        return notif

    def mark_all_read(self, user_id: str) -> None:
        self.db.query(Notification).filter(
            Notification.user_id == to_uuid(user_id), Notification.is_read == False
        ).update({"is_read": True})
        self.db.commit()


class NotificationService:
    def __init__(self, db: Session):
        self.repo = NotificationRepository(db)

    def get_notifications(
        self,
        user_id: str,
        page: int = 1,
        limit: int = 50,
        is_read: Optional[bool] = None,
        type: Optional[str] = None,
    ) -> tuple[list[Notification], int]:
        skip = (page - 1) * limit
        return self.repo.get_by_user(user_id, skip, limit, is_read, type)

    def get_unread_count(self, user_id: str) -> int:
        return self.repo.get_unread_count(user_id)

    def mark_read(self, id: str, user_id: str) -> Notification:
        notif = self.repo.mark_read(id, user_id)
        if not notif:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
        return notif

    def mark_all_read(self, user_id: str) -> None:
        self.repo.mark_all_read(user_id)

    def delete(self, id: str, user_id: str) -> None:
        notif = self.repo.get(id)
        if not notif or str(notif.user_id) != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
        self.repo.delete(id)

    def create_notification(
        self,
        user_id: str,
        type: str,
        title: str,
        message: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
    ) -> Notification:
        return self.repo.create(
            user_id=user_id,
            type=type,
            title=title,
            message=message,
            entity_type=entity_type,
            entity_id=entity_id,
        )


# ---------------------------------------------------------------------------
# Scheduled notification check functions (called by scheduler)
# ---------------------------------------------------------------------------

import structlog
logger = structlog.get_logger()


def _create_notification(
    db: Session,
    user_id: str,
    type: str,
    title: str,
    message: str,
    entity_type: str = None,
    entity_id: str = None,
) -> Notification:
    """Create a notification record, deduping by type+entity_id+today."""
    today = date.today()
    existing = db.query(Notification).filter(
        Notification.user_id == user_id,
        Notification.type == type,
        Notification.entity_id == entity_id,
        Notification.created_at >= today,
    ).first()
    if existing:
        return existing
    notification = Notification(
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        entity_type=entity_type,
        entity_id=entity_id,
        is_read=False,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def check_credit_card_dues(db: Session):
    """Check credit cards due in next 7 days and overdue."""
    from app.models.credit_card import CreditCard
    from app.models.user import User
    from app.services.email_service import send_email, build_due_alert_email

    today = date.today()
    alert_date = today + timedelta(days=7)
    cards = db.query(CreditCard).filter(
        CreditCard.is_active == True,
        CreditCard.due_date <= alert_date,
        CreditCard.due_date >= today,
        CreditCard.minimum_due > 0,
    ).all()
    overdue_cards = db.query(CreditCard).filter(
        CreditCard.is_active == True,
        CreditCard.due_date < today,
        CreditCard.minimum_due > 0,
    ).all()
    all_cards = overdue_cards + cards
    due_items_by_user = {}

    for card in all_cards:
        days = (card.due_date - today).days
        is_overdue = days < 0
        user_key = str(card.user_id)
        if user_key not in due_items_by_user:
            due_items_by_user[user_key] = []
        due_items_by_user[user_key].append({
            "name": f"{card.bank_name} - {card.card_name}",
            "type": "Credit Card",
            "amount": float(card.minimum_due or 0),
            "due_date": card.due_date.strftime("%d %b %Y"),
            "days_remaining": abs(days),
            "overdue": is_overdue,
        })
        title = f"{'OVERDUE' if is_overdue else 'Due Soon'}: {card.bank_name} Credit Card"
        message = f"Minimum due \u20b9{card.minimum_due:,.0f} {'was due on' if is_overdue else 'due on'} {card.due_date.strftime('%d %b %Y')}"
        _create_notification(db, str(card.user_id), "credit_card_due", title, message, "credit_card", str(card.id))

    for user_id, items in due_items_by_user.items():
        user = db.query(User).filter(User.id == user_id).first()
        if user and user.email:
            html = build_due_alert_email(user.full_name, items, "credit_card")
            send_email(user.email, "\u26a0\ufe0f Credit Card Payment Due \u2014 WealthWise", html)


def check_loan_emi_dues(db: Session):
    """Check loan EMIs due in next 7 days."""
    from app.models.debt import Debt
    from app.models.user import User
    from app.services.email_service import send_email, build_due_alert_email

    today = date.today()
    alert_date = today + timedelta(days=7)
    debts = db.query(Debt).filter(
        Debt.status == "active",
        Debt.due_date <= alert_date,
        Debt.due_date >= today - timedelta(days=1),
    ).all()
    due_items_by_user = {}

    for debt in debts:
        days = (debt.due_date - today).days
        is_overdue = days < 0
        user_key = str(debt.user_id)
        if user_key not in due_items_by_user:
            due_items_by_user[user_key] = []
        remaining = float(debt.total_amount or 0) - float(debt.paid_amount or 0)
        due_items_by_user[user_key].append({
            "name": debt.lender_name,
            "type": f"Loan EMI ({debt.debt_type})",
            "amount": float(debt.emi_amount or remaining),
            "due_date": debt.due_date.strftime("%d %b %Y"),
            "days_remaining": abs(days),
            "overdue": is_overdue,
        })
        title = f"{'OVERDUE' if is_overdue else 'EMI Due'}: {debt.lender_name}"
        message = f"EMI of \u20b9{debt.emi_amount:,.0f} {'was due' if is_overdue else 'due'} on {debt.due_date.strftime('%d %b %Y')}. Remaining: \u20b9{remaining:,.0f}"
        _create_notification(db, str(debt.user_id), "loan_emi_due", title, message, "debt", str(debt.id))

    for user_id, items in due_items_by_user.items():
        user = db.query(User).filter(User.id == user_id).first()
        if user and user.email:
            html = build_due_alert_email(user.full_name, items, "loan")
            send_email(user.email, "\u26a0\ufe0f Loan EMI Due \u2014 WealthWise", html)


def check_subscription_renewals(db: Session):
    """Check subscriptions renewing in next 7 days."""
    from app.models.subscription import Subscription

    today = date.today()
    alert_date = today + timedelta(days=7)
    subs = db.query(Subscription).filter(
        Subscription.is_active == True,
        Subscription.renewal_date <= alert_date,
        Subscription.renewal_date >= today,
    ).all()

    for sub in subs:
        days = (sub.renewal_date - today).days
        title = f"Subscription Renewal: {sub.service_name}"
        message = f"\u20b9{sub.amount:,.0f} will be charged in {days} day{'s' if days != 1 else ''} on {sub.renewal_date.strftime('%d %b %Y')}"
        _create_notification(db, str(sub.user_id), "subscription_renewal", title, message, "subscription", str(sub.id))

    logger.info(f"Subscription renewal check: {len(subs)} alerts created")


def check_budget_alerts(db: Session):
    """Check budgets where spending > 80%."""
    from app.models.budget import Budget
    from app.models.expense import Expense
    from app.models.category import Category
    from sqlalchemy import extract, func

    today = date.today()
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
        .filter(Budget.month == today.month, Budget.year == today.year)
        .group_by(Budget.user_id, Budget.category_id, Category.name, Budget.budget_amount)
        .all()
    )

    for b in budgets:
        if float(b.budget_amount or 0) <= 0:
            continue
        pct = (float(b.spent or 0) / float(b.budget_amount)) * 100
        if pct >= 80:
            if pct >= 100:
                title = "Budget Exceeded!"
                message = f"You have exceeded your budget. Spent \u20b9{b.spent:,.0f} of \u20b9{b.budget_amount:,.0f} ({pct:.0f}%)"
            else:
                title = "Budget Warning \u2014 80% Used"
                message = f"You have used {pct:.0f}% of your budget. Spent \u20b9{b.spent:,.0f} of \u20b9{b.budget_amount:,.0f}"
            _create_notification(db, str(b.user_id), "budget_alert", title, message, "budget", str(b.category_id))

    logger.info(f"Budget alert check: {len(budgets)} budgets checked")


def send_daily_expense_reminders(db: Session):
    """Send 8 PM daily reminder email to active users who haven't logged expenses today."""
    from app.models.user import User
    from app.models.expense import Expense
    from app.services.email_service import send_email, build_daily_reminder_email

    users = db.query(User).filter(User.is_active == True).all()
    today = date.today()
    today_str = today.strftime("%A, %d %B %Y")
    sent_count = 0

    for user in users:
        if not user.email:
            continue
        today_expenses = db.query(Expense).filter(
            Expense.user_id == user.id,
            Expense.expense_date == today,
        ).count()
        if today_expenses == 0:
            html = build_daily_reminder_email(user.full_name, today_str)
            send_email(user.email, f"\U0001f4dd Daily Reminder: Log your expenses \u2014 {today_str}", html)
            sent_count += 1

    logger.info(f"Daily reminder: sent to {sent_count}/{len(users)} users")
