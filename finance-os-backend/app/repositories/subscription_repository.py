from datetime import date, timedelta
from decimal import Decimal
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.subscription import Subscription
from app.repositories.base import BaseRepository, to_uuid


class SubscriptionRepository(BaseRepository[Subscription]):
    def __init__(self, db: Session):
        super().__init__(Subscription, db)

    def get_by_user(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 20,
        is_active: Optional[bool] = None,
        billing_cycle: Optional[str] = None,
    ) -> tuple[list[Subscription], int]:
        query = self.db.query(Subscription).filter(Subscription.user_id == to_uuid(user_id))
        if is_active is not None:
            query = query.filter(Subscription.is_active == is_active)
        if billing_cycle:
            query = query.filter(Subscription.billing_cycle == billing_cycle)
        total = query.count()
        items = query.order_by(Subscription.renewal_date.asc()).offset(skip).limit(limit).all()
        return items, total

    def get_upcoming_renewals(self, user_id: str, days: int = 30) -> list[Subscription]:
        today = date.today()
        future = today + timedelta(days=days)
        return (
            self.db.query(Subscription)
            .filter(
                Subscription.user_id == to_uuid(user_id),
                Subscription.is_active == True,
                Subscription.renewal_date >= today,
                Subscription.renewal_date <= future,
            )
            .all()
        )

    def get_monthly_cost(self, user_id: str) -> Decimal:
        result = (
            self.db.query(func.coalesce(func.sum(Subscription.amount), 0))
            .filter(
                Subscription.user_id == to_uuid(user_id),
                Subscription.is_active == True,
                Subscription.billing_cycle == "monthly",
            )
            .scalar()
        )
        return result

    def get_cost_by_category(self, user_id: str) -> list[tuple]:
        return (
            self.db.query(
                Subscription.category,
                func.sum(Subscription.amount).label("monthly_cost"),
            )
            .filter(
                Subscription.user_id == to_uuid(user_id),
                Subscription.is_active == True,
            )
            .group_by(Subscription.category)
            .all()
        )
