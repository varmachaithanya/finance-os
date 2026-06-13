from datetime import date, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from app.models.credit_card import CreditCard
from app.repositories.base import BaseRepository, to_uuid


class CreditCardRepository(BaseRepository[CreditCard]):
    def __init__(self, db: Session):
        super().__init__(CreditCard, db)

    def get_by_user(self, user_id: str) -> list[CreditCard]:
        return self.db.query(CreditCard).filter(CreditCard.user_id == to_uuid(user_id)).all()

    def get_active_by_user(self, user_id: str) -> list[CreditCard]:
        return (
            self.db.query(CreditCard)
            .filter(CreditCard.user_id == to_uuid(user_id), CreditCard.is_active == True)
            .all()
        )

    def get_upcoming_due(self, user_id: str, days: int = 7) -> list[CreditCard]:
        today = date.today()
        future = today + timedelta(days=days)
        return (
            self.db.query(CreditCard)
            .filter(
                CreditCard.user_id == to_uuid(user_id),
                CreditCard.is_active == True,
                CreditCard.due_date >= today,
                CreditCard.due_date <= future,
            )
            .all()
        )
