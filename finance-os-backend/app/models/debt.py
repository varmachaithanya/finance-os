import uuid
from decimal import Decimal

from sqlalchemy import Column, Date, ForeignKey, Numeric, String, Text, types
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin, generate_uuid


class Debt(Base, TimestampMixin):
    __tablename__ = "debts"

    id = Column(types.Uuid, primary_key=True, default=generate_uuid)
    user_id = Column(types.Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    lender_name = Column(String(200), nullable=False)
    debt_type = Column(String(50), nullable=False)
    total_amount = Column(Numeric(12, 2), nullable=False)
    paid_amount = Column(Numeric(12, 2), default=0)
    emi_amount = Column(Numeric(12, 2), nullable=True)
    interest_rate = Column(Numeric(5, 2), nullable=True)
    due_date = Column(Date, nullable=True)
    start_date = Column(Date, nullable=True)
    status = Column(String(20), default="active")
    notes = Column(Text, nullable=True)

    @property
    def remaining_amount(self) -> Decimal:
        return (self.total_amount or Decimal("0")) - (self.paid_amount or Decimal("0"))

    user = relationship("User", back_populates="debts")
