import uuid
from decimal import Decimal

from sqlalchemy import Column, ForeignKey, Integer, Numeric, String, UniqueConstraint, types
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin, generate_uuid


class Budget(Base, TimestampMixin):
    __tablename__ = "budgets"

    id = Column(types.Uuid, primary_key=True, default=generate_uuid)
    user_id = Column(types.Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(types.Uuid, ForeignKey("categories.id"), nullable=False)
    budget_amount = Column(Numeric(12, 2), nullable=False)
    period = Column(String(20), default="monthly")
    month = Column(Integer, nullable=True)
    year = Column(Integer, nullable=True)

    __table_args__ = (
        UniqueConstraint("user_id", "category_id", "month", "year", name="uq_user_category_month_year"),
    )

    user = relationship("User", back_populates="budgets")
    category = relationship("Category", back_populates="budgets")
