import uuid
from decimal import Decimal

from sqlalchemy import Boolean, Column, Date, ForeignKey, Numeric, String, types
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin, generate_uuid


class Expense(Base, TimestampMixin):
    __tablename__ = "expenses"

    id = Column(types.Uuid, primary_key=True, default=generate_uuid)
    user_id = Column(types.Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(types.Uuid, ForeignKey("categories.id"), nullable=True, index=True)
    amount = Column(Numeric(12, 2), nullable=False)
    description = Column(String(500), nullable=True)
    payment_method = Column(String(50), nullable=True)
    expense_date = Column(Date, nullable=False, index=True)
    is_recurring = Column(Boolean, default=False)
    ai_category_suggestion = Column(String(100), nullable=True)

    user = relationship("User", back_populates="expenses")
    category = relationship("Category", back_populates="expenses")
