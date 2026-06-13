from decimal import Decimal
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.budget import Budget
from app.repositories.budget_repository import BudgetRepository


class BudgetService:
    def __init__(self, db: Session):
        self.repo = BudgetRepository(db)

    def get_budgets(
        self,
        user_id: str,
        month: int,
        year: int,
        page: int = 1,
        limit: int = 20,
    ) -> tuple[list[Budget], int]:
        skip = (page - 1) * limit
        return self.repo.get_by_user_period(user_id, month, year, skip, limit)

    def create(
        self,
        user_id: str,
        category_id: str,
        budget_amount: Decimal,
        period: str = "monthly",
        month: Optional[int] = None,
        year: Optional[int] = None,
    ) -> Budget:
        return self.repo.create(
            user_id=user_id,
            category_id=category_id,
            budget_amount=budget_amount,
            period=period,
            month=month,
            year=year,
        )

    def update(self, id: str, user_id: str, **kwargs) -> Budget:
        budget = self.repo.get(id)
        if not budget or str(budget.user_id) != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found")
        updated = self.repo.update(id, **kwargs)
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found")
        return updated

    def delete(self, id: str, user_id: str) -> None:
        budget = self.repo.get(id)
        if not budget or str(budget.user_id) != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found")
        self.repo.delete(id)

    def get_vs_actual(self, user_id: str, month: int, year: int) -> dict:
        items = self.repo.get_vs_actual(user_id, month, year)
        data = []
        for r in items:
            budget = r.budget_amount
            spent = r.spent
            remaining = budget - spent
            pct = float(spent) / float(budget) * 100 if budget > 0 else 0
            data.append({
                "category_id": str(r.category_id),
                "category_name": r.category_name,
                "budget": budget,
                "spent": spent,
                "remaining": remaining,
                "pct_used": round(pct, 2),
            })
        return {"data": data, "month": month, "year": year}

    def get_alerts(self, user_id: str, month: int, year: int, threshold: float = 0.8) -> list[dict]:
        items = self.repo.get_alerts(user_id, month, year, threshold)
        return [
            {
                "category_id": str(r.category_id),
                "category_name": r.category_name,
                "budget": r.budget_amount,
                "spent": r.spent,
                "pct_used": round(float(r.pct_used) * 100, 2),
            }
            for r in items
        ]
