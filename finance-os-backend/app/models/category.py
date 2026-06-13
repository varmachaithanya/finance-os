import uuid
from sqlalchemy import Boolean, Column, ForeignKey, String, types
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin, generate_uuid


class Category(Base, TimestampMixin):
    __tablename__ = "categories"

    id = Column(types.Uuid, primary_key=True, default=generate_uuid)
    user_id = Column(types.Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String(100), nullable=False)
    type = Column(String(20), nullable=False)
    icon = Column(String(50), nullable=True)
    color = Column(String(20), nullable=True)
    is_default = Column(Boolean, default=False)

    user = relationship("User", back_populates="categories")
    expenses = relationship("Expense", back_populates="category")
    budgets = relationship("Budget", back_populates="category")
