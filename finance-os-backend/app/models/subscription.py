import uuid
from decimal import Decimal

from sqlalchemy import Boolean, Column, Date, ForeignKey, Numeric, String, types
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin, generate_uuid


class Subscription(Base, TimestampMixin):
    __tablename__ = "subscriptions"

    id = Column(types.Uuid, primary_key=True, default=generate_uuid)
    user_id = Column(types.Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    service_name = Column(String(100), nullable=False)
    category = Column(String(50), nullable=True)
    amount = Column(Numeric(12, 2), nullable=False)
    billing_cycle = Column(String(20), default="monthly")
    renewal_date = Column(Date, nullable=False)
    auto_renewal = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    notes = Column(String(500), nullable=True)

    user = relationship("User", back_populates="subscriptions")
