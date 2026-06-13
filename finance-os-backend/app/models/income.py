import uuid
from decimal import Decimal

from sqlalchemy import Boolean, Column, Date, ForeignKey, Numeric, String, types
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin, generate_uuid


class Income(Base, TimestampMixin):
    __tablename__ = "income"

    id = Column(types.Uuid, primary_key=True, default=generate_uuid)
    user_id = Column(types.Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    source = Column(String(100), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    description = Column(String(500), nullable=True)
    income_date = Column(Date, nullable=False, index=True)
    is_recurring = Column(Boolean, default=False)

    user = relationship("User", back_populates="income")
