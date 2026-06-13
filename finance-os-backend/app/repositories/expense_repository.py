from datetime import date, timedelta
from decimal import Decimal
from typing import Optional

from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from app.models.expense import Expense
from app.repositories.base import BaseRepository, to_uuid


class ExpenseRepository(BaseRepository[Expense]):
    def __init__(self, db: Session):
        super().__init__(Expense, db)

    def get_by_user(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 20,
        sort: str = "expense_date",
        order: str = "desc",
        search: Optional[str] = None,
        category_id: Optional[str] = None,
        payment_method: Optional[str] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
    ) -> tuple[list[Expense], int]:
        query = self.db.query(Expense).filter(Expense.user_id == to_uuid(user_id))
        if category_id:
            query = query.filter(Expense.category_id == to_uuid(category_id))
        if payment_method:
            query = query.filter(Expense.payment_method == payment_method)
        if from_date:
            query = query.filter(Expense.expense_date >= from_date)
        if to_date:
            query = query.filter(Expense.expense_date <= to_date)
        if search:
            query = query.filter(Expense.description.ilike(f"%{search}%"))
        total = query.count()
        sort_col = getattr(Expense, sort, Expense.expense_date)
        query = query.order_by(sort_col.desc() if order == "desc" else sort_col.asc())
        items = query.offset(skip).limit(limit).all()
        return items, total

    def get_summary_by_category(self, user_id: str, month: int, year: int) -> list[tuple]:
        return (
            self.db.query(
                Expense.category_id,
                func.sum(Expense.amount).label("total"),
                func.count(Expense.id).label("count"),
            )
            .filter(
                Expense.user_id == to_uuid(user_id),
                extract("month", Expense.expense_date) == month,
                extract("year", Expense.expense_date) == year,
            )
            .group_by(Expense.category_id)
            .all()
        )

    def get_total_for_period(self, user_id: str, from_date: date, to_date: date) -> Decimal:
        result = (
            self.db.query(func.coalesce(func.sum(Expense.amount), 0))
            .filter(
                Expense.user_id == to_uuid(user_id),
                Expense.expense_date >= from_date,
                Expense.expense_date <= to_date,
            )
            .scalar()
        )
        return result

    def get_monthly_totals(self, user_id: str, months: int) -> list[tuple]:
        start_date = date.today().replace(day=1) - timedelta(days=months * 31)
        start_date = start_date.replace(day=1)
        results = (
            self.db.query(
                extract("year", Expense.expense_date).label("year"),
                extract("month", Expense.expense_date).label("month"),
                func.sum(Expense.amount).label("total"),
            )
            .filter(
                Expense.user_id == to_uuid(user_id),
                Expense.expense_date >= start_date,
            )
            .group_by("year", "month")
            .order_by("year", "month")
            .all()
        )
        return [
            (f"{int(r.year)}-{int(r.month):02d}", r.total)
            for r in results
        ]
