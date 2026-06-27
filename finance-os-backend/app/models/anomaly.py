from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Numeric, String, Text, types
from sqlalchemy.orm import relationship
from app.models.base import Base, TimestampMixin, generate_uuid


class AnomalyAlert(Base, TimestampMixin):
    __tablename__ = "anomaly_alerts"

    id = Column(types.Uuid, primary_key=True, default=generate_uuid)
    user_id = Column(types.Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(50), nullable=False)
    severity = Column(String(20), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    amount = Column(Numeric(12, 2), nullable=True)
    category_name = Column(String(100), nullable=True)
    merchant = Column(String(200), nullable=True)
    expense_id = Column(types.Uuid, nullable=True)
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", backref="anomaly_alerts")
