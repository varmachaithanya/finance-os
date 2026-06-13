import uuid
from sqlalchemy import Boolean, Column, String, types
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin, generate_uuid


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id = Column(types.Uuid, primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    currency = Column(String(10), default="INR")
    timezone = Column(String(50), default="Asia/Kolkata")
    avatar_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)

    expenses = relationship("Expense", back_populates="user", cascade="all, delete-orphan")
    income = relationship("Income", back_populates="user", cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="user", cascade="all, delete-orphan")
    credit_cards = relationship("CreditCard", back_populates="user", cascade="all, delete-orphan")
    debts = relationship("Debt", back_populates="user", cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="user", cascade="all, delete-orphan")
    budgets = relationship("Budget", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
