from datetime import date
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.expense import Expense
from app.repositories.expense_repository import ExpenseRepository
from app.services.ai_categorizer import suggest_category


class ExpenseService:
    def __init__(self, db: Session):
        self.repo = ExpenseRepository(db)

    def get_expenses(
        self,
        user_id: str,
        page: int = 1,
        limit: int = 20,
        sort: str = "expense_date",
        order: str = "desc",
        search: Optional[str] = None,
        category_id: Optional[str] = None,
        payment_method: Optional[str] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
    ) -> tuple[list[Expense], int]:
        skip = (page - 1) * limit
        return self.repo.get_by_user(
            user_id=user_id,
            skip=skip,
            limit=limit,
            sort=sort,
            order=order,
            search=search,
            category_id=category_id,
            payment_method=payment_method,
            from_date=from_date,
            to_date=to_date,
        )

    def get_by_id(self, id: str, user_id: str) -> Expense:
        expense = self.repo.get(id)
        if not expense or str(expense.user_id) != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
        return expense

    def create(self, user_id: str, amount: Decimal, expense_date: date, category_id: Optional[str] = None, description: Optional[str] = None, payment_method: Optional[str] = None, is_recurring: bool = False) -> Expense:
        ai_suggestion = suggest_category(description) if description else None
        return self.repo.create(
            user_id=user_id,
            amount=amount,
            category_id=category_id,
            description=description,
            payment_method=payment_method,
            expense_date=expense_date,
            is_recurring=is_recurring,
            ai_category_suggestion=ai_suggestion,
        )

    def update(self, id: str, user_id: str, **kwargs) -> Expense:
        expense = self.repo.get(id)
        if not expense or str(expense.user_id) != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
        if "description" in kwargs and kwargs["description"]:
            kwargs["ai_category_suggestion"] = suggest_category(kwargs["description"])
        updated = self.repo.update(id, **kwargs)
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
        return updated

    def delete(self, id: str, user_id: str) -> None:
        expense = self.repo.get(id)
        if not expense or str(expense.user_id) != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense not found")
        self.repo.delete(id)

    def get_summary(self, user_id: str, month: int, year: int) -> dict:
        items = self.repo.get_summary_by_category(user_id, month, year)
        total = sum((item.total for item in items), Decimal("0"))
        return {
            "data": [{"category_id": str(r.category_id) if r.category_id else None, "total": r.total, "count": r.count} for r in items],
            "total_amount": total,
            "month": month,
            "year": year,
        }

    def bulk_create(self, user_id: str, expenses_data: list[dict]) -> list[Expense]:
        created = []
        for data in expenses_data:
            e = self.create(user_id=user_id, **data)
            created.append(e)
        return created

    def ai_suggest(self, description: str) -> dict:
        category = suggest_category(description)
        return {"suggested_category": category}
