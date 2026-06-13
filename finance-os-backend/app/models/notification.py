import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text, types
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin, generate_uuid


class Notification(Base, TimestampMixin):
    __tablename__ = "notifications"

    id = Column(types.Uuid, primary_key=True, default=generate_uuid)
    user_id = Column(types.Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String(50), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(types.Uuid, nullable=True)
    is_read = Column(Boolean, default=False)
    scheduled_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="notifications")
