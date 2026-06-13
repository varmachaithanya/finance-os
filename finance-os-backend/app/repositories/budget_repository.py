from decimal import Decimal
from typing import Optional

from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from app.models.budget import Budget
from app.models.expense import Expense
from app.models.category import Category
from app.repositories.base import BaseRepository, to_uuid


class BudgetRepository(BaseRepository[Budget]):
    def __init__(self, db: Session):
        super().__init__(Budget, db)

    def get_by_user_period(
        self,
        user_id: str,
        month: int,
        year: int,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[list[Budget], int]:
        query = (
            self.db.query(Budget)
            .filter(
                Budget.user_id == to_uuid(user_id),
                Budget.month == month,
                Budget.year == year,
            )
        )
        total = query.count()
        items = query.order_by(Budget.created_at.desc()).offset(skip).limit(limit).all()
        return items, total

    def get_vs_actual(self, user_id: str, month: int, year: int) -> list[tuple]:
        results = (
            self.db.query(
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
                & (extract("month", Expense.expense_date) == month)
                & (extract("year", Expense.expense_date) == year),
            )
            .filter(
                Budget.user_id == to_uuid(user_id),
                Budget.month == month,
                Budget.year == year,
            )
            .group_by(Budget.category_id, Category.name, Budget.budget_amount)
            .order_by(Category.name)
            .all()
        )
        return results

    def get_alerts(self, user_id: str, month: int, year: int, threshold: float = 0.8) -> list[tuple]:
        results = (
            self.db.query(
                Budget.category_id,
                Category.name.label("category_name"),
                Budget.budget_amount,
                func.coalesce(func.sum(Expense.amount), 0).label("spent"),
                ((func.coalesce(func.sum(Expense.amount), 0) / Budget.budget_amount)).label("pct_used"),
            )
            .join(Category, Category.id == Budget.category_id)
            .outerjoin(
                Expense,
                (Expense.category_id == Budget.category_id)
                & (Expense.user_id == Budget.user_id)
                & (extract("month", Expense.expense_date) == month)
                & (extract("year", Expense.expense_date) == year),
            )
            .filter(
                Budget.user_id == to_uuid(user_id),
                Budget.month == month,
                Budget.year == year,
            )
            .group_by(Budget.category_id, Category.name, Budget.budget_amount)
            .having(
                (func.coalesce(func.sum(Expense.amount), 0) / Budget.budget_amount) > threshold
            )
            .order_by(func.coalesce(func.sum(Expense.amount), 0) / Budget.budget_amount)
            .all()
        )
        return results
