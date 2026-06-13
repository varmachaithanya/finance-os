from datetime import date
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.debt import Debt
from app.repositories.debt_repository import DebtRepository


class DebtService:
    def __init__(self, db: Session):
        self.repo = DebtRepository(db)

    def get_debts(
        self,
        user_id: str,
        page: int = 1,
        limit: int = 20,
        debt_type: Optional[str] = None,
        status: Optional[str] = None,
    ) -> tuple[list[Debt], int]:
        skip = (page - 1) * limit
        return self.repo.get_by_user(user_id, skip, limit, debt_type, status)

    def get_by_id(self, id: str, user_id: str) -> Debt:
        debt = self.repo.get(id)
        if not debt or str(debt.user_id) != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debt not found")
        return debt

    def create(
        self,
        user_id: str,
        lender_name: str,
        debt_type: str,
        total_amount: Decimal,
        paid_amount: Decimal = 0,
        emi_amount: Optional[Decimal] = None,
        interest_rate: Optional[Decimal] = None,
        due_date: Optional[date] = None,
        start_date: Optional[date] = None,
        notes: Optional[str] = None,
    ) -> Debt:
        return self.repo.create(
            user_id=user_id,
            lender_name=lender_name,
            debt_type=debt_type,
            total_amount=total_amount,
            paid_amount=paid_amount,
            emi_amount=emi_amount,
            interest_rate=interest_rate,
            due_date=due_date,
            start_date=start_date,
            notes=notes,
        )

    def update(self, id: str, user_id: str, **kwargs) -> Debt:
        debt = self.repo.get(id)
        if not debt or str(debt.user_id) != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debt not found")
        updated = self.repo.update(id, **kwargs)
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debt not found")
        return updated

    def delete(self, id: str, user_id: str) -> None:
        debt = self.repo.get(id)
        if not debt or str(debt.user_id) != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debt not found")
        self.repo.delete(id)

    def record_payment(self, id: str, user_id: str, amount: Decimal) -> Debt:
        debt = self.repo.get(id)
        if not debt or str(debt.user_id) != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debt not found")
        if debt.status == "paid":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Debt is already paid")
        remaining = debt.total_amount - debt.paid_amount
        if amount > remaining:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment exceeds remaining amount")
        updated = self.repo.update_paid_amount(id, amount)
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Debt not found")
        return updated

    def get_summary(self, user_id: str) -> dict:
        total_owed, total_paid, active_count = self.repo.get_summary(user_id)
        total_remaining = total_owed - total_paid
        return {
            "total_owed": total_owed,
            "total_paid": total_paid,
            "total_remaining": total_remaining,
            "active_count": active_count,
        }

    def get_payoff_plan(self, user_id: str, strategy: str = "snowball") -> dict:
        debts, _ = self.repo.get_by_user(user_id, status="active")
        debt_list = []
        for d in debts:
            remaining = d.total_amount - d.paid_amount
            debt_list.append({
                "id": d.id,
                "lender_name": d.lender_name,
                "total_amount": d.total_amount,
                "remaining_amount": remaining,
                "interest_rate": d.interest_rate,
                "emi_amount": d.emi_amount,
            })

        if strategy == "avalanche":
            debt_list.sort(key=lambda x: float(x["interest_rate"] or 0), reverse=True)
        else:
            debt_list.sort(key=lambda x: float(x["remaining_amount"]))

        result = []
        for d in debt_list:
            emi = d["emi_amount"] or (d["remaining_amount"] / 12)
            months = 0
            if emi > 0:
                months = int((d["remaining_amount"] / emi).quantize(0, rounding=ROUND_HALF_UP))
                if months < 1:
                    months = 1
            result.append({
                "debt_id": str(d["id"]),
                "lender_name": d["lender_name"],
                "total_amount": d["total_amount"],
                "remaining_amount": d["remaining_amount"],
                "interest_rate": d["interest_rate"],
                "estimated_months": months,
                "monthly_payment": emi,
            })

        return {"strategy": strategy, "debts": result}
