from datetime import date
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.income import Income
from app.repositories.income_repository import IncomeRepository


class IncomeService:
    def __init__(self, db: Session):
        self.repo = IncomeRepository(db)

    def get_income(
        self,
        user_id: str,
        page: int = 1,
        limit: int = 20,
        sort: str = "income_date",
        order: str = "desc",
        search: Optional[str] = None,
        source: Optional[str] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
    ) -> tuple[list[Income], int]:
        skip = (page - 1) * limit
        return self.repo.get_by_user(
            user_id=user_id,
            skip=skip,
            limit=limit,
            sort=sort,
            order=order,
            search=search,
            source=source,
            from_date=from_date,
            to_date=to_date,
        )

    def get_by_id(self, id: str, user_id: str) -> Income:
        income = self.repo.get(id)
        if not income or str(income.user_id) != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Income not found")
        return income

    def create(self, user_id: str, source: str, amount: Decimal, income_date: date, description: Optional[str] = None, is_recurring: bool = False) -> Income:
        return self.repo.create(
            user_id=user_id,
            source=source,
            amount=amount,
            description=description,
            income_date=income_date,
            is_recurring=is_recurring,
        )

    def update(self, id: str, user_id: str, **kwargs) -> Income:
        income = self.repo.get(id)
        if not income or str(income.user_id) != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Income not found")
        updated = self.repo.update(id, **kwargs)
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Income not found")
        return updated

    def delete(self, id: str, user_id: str) -> None:
        income = self.repo.get(id)
        if not income or str(income.user_id) != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Income not found")
        self.repo.delete(id)

    def get_summary(self, user_id: str, month: int, year: int) -> dict:
        items = self.repo.get_summary_by_source(user_id, month, year)
        total = sum((item.total for item in items), Decimal("0"))
        return {
            "data": [{"source": r.source, "total": r.total, "count": r.count} for r in items],
            "total_amount": total,
            "month": month,
            "year": year,
        }
