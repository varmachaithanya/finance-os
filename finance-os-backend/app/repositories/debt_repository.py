from datetime import date, timedelta
from decimal import Decimal
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.debt import Debt
from app.repositories.base import BaseRepository, to_uuid


class DebtRepository(BaseRepository[Debt]):
    def __init__(self, db: Session):
        super().__init__(Debt, db)

    def get_by_user(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 20,
        debt_type: Optional[str] = None,
        status: Optional[str] = None,
    ) -> tuple[list[Debt], int]:
        query = self.db.query(Debt).filter(Debt.user_id == to_uuid(user_id))
        if debt_type:
            query = query.filter(Debt.debt_type == debt_type)
        if status:
            query = query.filter(Debt.status == status)
        total = query.count()
        items = query.order_by(Debt.created_at.desc()).offset(skip).limit(limit).all()
        return items, total

    def get_summary(self, user_id: str) -> tuple[Decimal, Decimal, int]:
        result = (
            self.db.query(
                func.coalesce(func.sum(Debt.total_amount), 0),
                func.coalesce(func.sum(Debt.paid_amount), 0),
                func.count(Debt.id),
            )
            .filter(Debt.user_id == to_uuid(user_id), Debt.status == "active")
            .first()
        )
        return result

    def get_upcoming_due(self, user_id: str, days: int = 7) -> list[Debt]:
        today = date.today()
        future = today + timedelta(days=days)
        return (
            self.db.query(Debt)
            .filter(
                Debt.user_id == to_uuid(user_id),
                Debt.status == "active",
                Debt.due_date >= today,
                Debt.due_date <= future,
            )
            .all()
        )

    def update_paid_amount(self, id: str, amount: Decimal) -> Optional[Debt]:
        debt = self.get(id)
        if not debt:
            return None
        debt.paid_amount += amount
        if debt.paid_amount >= debt.total_amount:
            debt.status = "paid"
        self.db.commit()
        self.db.refresh(debt)
        return debt
