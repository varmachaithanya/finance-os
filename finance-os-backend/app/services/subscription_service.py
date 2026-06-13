from datetime import date, timedelta
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.subscription import Subscription
from app.repositories.subscription_repository import SubscriptionRepository


class SubscriptionService:
    def __init__(self, db: Session):
        self.repo = SubscriptionRepository(db)

    def get_subscriptions(
        self,
        user_id: str,
        page: int = 1,
        limit: int = 20,
        is_active: Optional[bool] = None,
        billing_cycle: Optional[str] = None,
    ) -> tuple[list[Subscription], int]:
        skip = (page - 1) * limit
        return self.repo.get_by_user(user_id, skip, limit, is_active, billing_cycle)

    def get_by_id(self, id: str, user_id: str) -> Subscription:
        sub = self.repo.get(id)
        if not sub or str(sub.user_id) != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found")
        return sub

    def create(
        self,
        user_id: str,
        service_name: str,
        amount: Decimal,
        renewal_date: date,
        category: Optional[str] = None,
        billing_cycle: str = "monthly",
        auto_renewal: bool = True,
        notes: Optional[str] = None,
    ) -> Subscription:
        return self.repo.create(
            user_id=user_id,
            service_name=service_name,
            category=category,
            amount=amount,
            billing_cycle=billing_cycle,
            renewal_date=renewal_date,
            auto_renewal=auto_renewal,
            notes=notes,
        )

    def update(self, id: str, user_id: str, **kwargs) -> Subscription:
        sub = self.repo.get(id)
        if not sub or str(sub.user_id) != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found")
        updated = self.repo.update(id, **kwargs)
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found")
        return updated

    def delete(self, id: str, user_id: str) -> None:
        sub = self.repo.get(id)
        if not sub or str(sub.user_id) != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found")
        self.repo.delete(id)

    def toggle_active(self, id: str, user_id: str) -> Subscription:
        sub = self.repo.get(id)
        if not sub or str(sub.user_id) != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found")
        return self.repo.update(id, is_active=not sub.is_active)

    def get_upcoming(self, user_id: str, days: int = 30) -> list[dict]:
        subs = self.repo.get_upcoming_renewals(user_id, days)
        today = date.today()
        return [
            {
                "id": str(s.id),
                "service_name": s.service_name,
                "amount": s.amount,
                "renewal_date": s.renewal_date,
                "days_remaining": (s.renewal_date - today).days,
            }
            for s in subs
        ]

    def get_monthly_cost(self, user_id: str) -> dict:
        monthly_total = self.repo.get_monthly_cost(user_id)
        # Add yearly/quarterly converted to monthly
        subs = self.repo.get_by_user(user_id, limit=1000)[0]
        for s in subs:
            if s.is_active:
                if s.billing_cycle == "yearly":
                    monthly_total += s.amount / Decimal("12")
                elif s.billing_cycle == "quarterly":
                    monthly_total += s.amount / Decimal("3")

        by_category = self.repo.get_cost_by_category(user_id)
        return {
            "total_monthly_cost": monthly_total.quantize(Decimal("0.01")),
            "by_category": [
                {"category": r.category or "other", "monthly_cost": r.monthly_cost}
                for r in by_category
            ],
        }
