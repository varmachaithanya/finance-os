import uuid
from datetime import date, timedelta, datetime, timezone
from decimal import Decimal
from statistics import mean
from typing import Union
from sqlalchemy import extract, func
from sqlalchemy.orm import Session
from app.models.expense import Expense
from app.models.category import Category
from app.models.anomaly import AnomalyAlert
from app.schemas.ai import AnomalyItem


class AnomalyDetectionService:
    def __init__(self, db: Session):
        self.db = db

    def detect(self, user_id: Union[str, uuid.UUID]) -> list[AnomalyItem]:
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        today = date.today()
        thirty_days_ago = today - timedelta(days=30)
        three_months_ago = today - timedelta(days=90)
        anomalies: list[AnomalyItem] = []

        category_averages: dict[str, float] = {}
        rows = (
            self.db.query(
                Category.name.label("cat_name"),
                func.avg(Expense.amount).label("avg_amount"),
            )
            .outerjoin(Category, Category.id == Expense.category_id)
            .filter(
                Expense.user_id == user_id,
                Expense.expense_date >= three_months_ago,
                Expense.expense_date < today,
            )
            .group_by(Category.name)
            .all()
        )
        for row in rows:
            name = row.cat_name or "Other"
            category_averages[name] = float(row.avg_amount) if row.avg_amount else 0

        recent_expenses = (
            self.db.query(Expense)
            .filter(
                Expense.user_id == user_id,
                Expense.expense_date >= thirty_days_ago,
            )
            .order_by(Expense.expense_date.desc())
            .all()
        )

        avg_all = mean([float(e.amount) for e in recent_expenses]) if recent_expenses else 0

        for expense in recent_expenses:
            cat_name = expense.category.name if expense.category else "Other"
            cat_avg = category_averages.get(cat_name, 0)
            amount_f = float(expense.amount)

            if cat_avg > 0 and amount_f > cat_avg * 3:
                existing = self.db.query(AnomalyAlert).filter(
                    AnomalyAlert.user_id == user_id,
                    AnomalyAlert.expense_id == expense.id,
                    AnomalyAlert.type == "high_spend",
                ).first()
                if existing:
                    continue
                title = f"Unusually High {cat_name} Spend"
                message = f"You spent ₹{amount_f:,.0f} on {cat_name}. Your average is ₹{cat_avg:,.0f}."
                alert = AnomalyAlert(
                    user_id=user_id,
                    type="high_spend",
                    severity="high" if amount_f > cat_avg * 5 else "medium",
                    title=title,
                    message=message,
                    amount=expense.amount,
                    category_name=cat_name,
                    expense_id=expense.id,
                )
                self.db.add(alert)
                self.db.flush()
                anomalies.append(AnomalyItem(
                    id=str(alert.id),
                    type=alert.type, severity=alert.severity,
                    title=alert.title, message=alert.message,
                    amount=alert.amount, category_name=alert.category_name,
                    is_resolved=False, created_at=alert.created_at,
                ))

            if avg_all > 0 and amount_f > avg_all * 3:
                existing = self.db.query(AnomalyAlert).filter(
                    AnomalyAlert.user_id == user_id,
                    AnomalyAlert.expense_id == expense.id,
                    AnomalyAlert.type == "large_sudden",
                ).first()
                if existing:
                    continue
                title = "Large Sudden Expense"
                message = f"You spent ₹{amount_f:,.0f}. Your monthly average is ₹{avg_all:,.0f}."
                alert = AnomalyAlert(
                    user_id=user_id,
                    type="large_sudden",
                    severity="high",
                    title=title,
                    message=message,
                    amount=expense.amount,
                    category_name=cat_name,
                    expense_id=expense.id,
                )
                self.db.add(alert)
                self.db.flush()
                anomalies.append(AnomalyItem(
                    id=str(alert.id), type=alert.type,
                    severity=alert.severity, title=alert.title,
                    message=alert.message, amount=alert.amount,
                    category_name=alert.category_name, is_resolved=False,
                    created_at=alert.created_at,
                ))

        amount_pairs: dict[str, list[Expense]] = {}
        for expense in recent_expenses:
            key = f"{float(expense.amount):.2f}"
            if key not in amount_pairs:
                amount_pairs[key] = []
            amount_pairs[key].append(expense)

        for amt_str, exps in amount_pairs.items():
            if len(exps) >= 2:
                pairs = list(zip(exps, exps[1:]))
                for e1, e2 in pairs[:1]:
                    amt = float(e1.amount)
                    if amt < 10:
                        continue
                    desc1 = (e1.description or "").lower()
                    desc2 = (e2.description or "").lower()
                    if desc1 == desc2 and desc1:
                        existing = self.db.query(AnomalyAlert).filter(
                            AnomalyAlert.user_id == user_id,
                            AnomalyAlert.amount == e1.amount,
                            AnomalyAlert.type == "duplicate",
                            AnomalyAlert.created_at >= datetime.now(timezone.utc) - timedelta(hours=24),
                        ).first()
                        if existing:
                            continue
                        title = "Possible Duplicate Transaction"
                        message = f"₹{amt:,.0f} appears twice: '{e1.description}' on {e1.expense_date} and {e2.expense_date}."
                        alert = AnomalyAlert(
                            user_id=user_id, type="duplicate",
                            severity="medium", title=title, message=message,
                            amount=e1.amount, expense_id=e1.id,
                        )
                        self.db.add(alert)
                        self.db.flush()
                        anomalies.append(AnomalyItem(
                            id=str(alert.id), type=alert.type,
                            severity=alert.severity, title=alert.title,
                            message=alert.message, amount=alert.amount,
                            is_resolved=False, created_at=alert.created_at,
                        ))
                    elif len(exps) >= 3:
                        existing = self.db.query(AnomalyAlert).filter(
                            AnomalyAlert.user_id == user_id,
                            AnomalyAlert.amount == e1.amount,
                            AnomalyAlert.type == "repeated",
                            AnomalyAlert.created_at >= datetime.now(timezone.utc) - timedelta(hours=24),
                        ).first()
                        if existing:
                            continue
                        title = "Repeated Amount Detected"
                        message = f"₹{amt:,.0f} appears {len(exps)} times. This may be a recurring charge."
                        alert = AnomalyAlert(
                            user_id=user_id, type="repeated",
                            severity="low", title=title, message=message,
                            amount=e1.amount, expense_id=e1.id,
                        )
                        self.db.add(alert)
                        self.db.flush()
                        anomalies.append(AnomalyItem(
                            id=str(alert.id), type=alert.type,
                            severity=alert.severity, title=alert.title,
                            message=alert.message, amount=alert.amount,
                            is_resolved=False, created_at=alert.created_at,
                        ))

        self.db.commit()

        existing_alerts = (
            self.db.query(AnomalyAlert)
            .filter(
                AnomalyAlert.user_id == user_id,
                AnomalyAlert.is_resolved == False,
            )
            .order_by(AnomalyAlert.created_at.desc())
            .limit(50)
            .all()
        )
        seen_ids = {a.id for a in anomalies}
        for alert in existing_alerts:
            if str(alert.id) not in seen_ids:
                anomalies.append(AnomalyItem(
                    id=str(alert.id), type=alert.type,
                    severity=alert.severity, title=alert.title,
                    message=alert.message, amount=alert.amount,
                    category_name=alert.category_name,
                    is_resolved=False, created_at=alert.created_at,
                ))

        anomalies.sort(key=lambda a: {"high": 0, "medium": 1, "low": 2}[a.severity])
        return anomalies

    def get_alerts(self, user_id: Union[str, uuid.UUID]) -> list[AnomalyItem]:
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        alerts = (
            self.db.query(AnomalyAlert)
            .filter(
                AnomalyAlert.user_id == user_id,
                AnomalyAlert.is_resolved == False,
            )
            .order_by(AnomalyAlert.created_at.desc())
            .limit(50)
            .all()
        )
        return [AnomalyItem(
            id=str(a.id), type=a.type, severity=a.severity,
            title=a.title, message=a.message, amount=a.amount,
            category_name=a.category_name, is_resolved=a.is_resolved,
            created_at=a.created_at,
        ) for a in alerts]

    def resolve(self, user_id: Union[str, uuid.UUID], alert_id: str) -> None:
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        alert = (
            self.db.query(AnomalyAlert)
            .filter(AnomalyAlert.id == uuid.UUID(alert_id), AnomalyAlert.user_id == user_id)
            .first()
        )
        if alert:
            alert.is_resolved = True
            alert.resolved_at = datetime.now(timezone.utc)
            self.db.commit()

    def unread_count(self, user_id: Union[str, uuid.UUID]) -> int:
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        return (
            self.db.query(func.count(AnomalyAlert.id))
            .filter(
                AnomalyAlert.user_id == user_id,
                AnomalyAlert.is_resolved == False,
                AnomalyAlert.created_at >= datetime.now(timezone.utc) - timedelta(days=7),
            )
            .scalar()
        )
