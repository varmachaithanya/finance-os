from datetime import date
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.credit_card import CreditCard
from app.repositories.credit_card_repository import CreditCardRepository


class CreditCardService:
    def __init__(self, db: Session):
        self.repo = CreditCardRepository(db)

    def get_all(self, user_id: str) -> list[CreditCard]:
        return self.repo.get_by_user(user_id)

    def get_by_id(self, id: str, user_id: str) -> CreditCard:
        card = self.repo.get(id)
        if not card or str(card.user_id) != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Credit card not found")
        return card

    def create(
        self,
        user_id: str,
        bank_name: str,
        card_name: str,
        credit_limit: Decimal,
        outstanding_balance: Decimal = 0,
        minimum_due: Decimal = 0,
        due_date: Optional[date] = None,
        last_four_digits: Optional[str] = None,
    ) -> CreditCard:
        return self.repo.create(
            user_id=user_id,
            bank_name=bank_name,
            card_name=card_name,
            last_four_digits=last_four_digits,
            credit_limit=credit_limit,
            outstanding_balance=outstanding_balance,
            minimum_due=minimum_due,
            due_date=due_date,
        )

    def update(self, id: str, user_id: str, **kwargs) -> CreditCard:
        card = self.repo.get(id)
        if not card or str(card.user_id) != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Credit card not found")
        updated = self.repo.update(id, **kwargs)
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Credit card not found")
        return updated

    def delete(self, id: str, user_id: str) -> None:
        card = self.repo.get(id)
        if not card or str(card.user_id) != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Credit card not found")
        self.repo.delete(id)

    def get_utilization(self, user_id: str) -> list[dict]:
        cards = self.repo.get_active_by_user(user_id)
        result = []
        for card in cards:
            limit = card.credit_limit
            balance = card.outstanding_balance
            pct = float(balance) / float(limit) * 100 if limit > 0 else 0
            if pct < 30:
                status_label = "green"
            elif pct <= 60:
                status_label = "yellow"
            else:
                status_label = "red"
            result.append({
                "card_id": str(card.id),
                "card_name": card.card_name,
                "bank_name": card.bank_name,
                "utilization_pct": round(pct, 2),
                "status": status_label,
            })
        return result

    def get_due_alerts(self, user_id: str, days: int = 7) -> list[dict]:
        cards = self.repo.get_upcoming_due(user_id, days)
        today = date.today()
        result = []
        for card in cards:
            days_remaining = (card.due_date - today).days if card.due_date else 0
            result.append({
                "card_id": str(card.id),
                "card_name": card.card_name,
                "bank_name": card.bank_name,
                "due_date": card.due_date,
                "minimum_due": card.minimum_due,
                "days_remaining": days_remaining,
            })
        return result
