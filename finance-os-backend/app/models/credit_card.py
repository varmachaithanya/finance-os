import uuid
from decimal import Decimal

from sqlalchemy import Boolean, Column, Date, ForeignKey, Numeric, String, types
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin, generate_uuid


class CreditCard(Base, TimestampMixin):
    __tablename__ = "credit_cards"

    id = Column(types.Uuid, primary_key=True, default=generate_uuid)
    user_id = Column(types.Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    bank_name = Column(String(100), nullable=False)
    card_name = Column(String(100), nullable=False)
    last_four_digits = Column(String(4), nullable=True)
    credit_limit = Column(Numeric(12, 2), nullable=False)
    outstanding_balance = Column(Numeric(12, 2), default=0)
    minimum_due = Column(Numeric(12, 2), default=0)
    due_date = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True)

    user = relationship("User", back_populates="credit_cards")
