import uuid

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Text, types
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin, generate_uuid


class GmailToken(Base, TimestampMixin):
    __tablename__ = "gmail_tokens"

    id = Column(types.Uuid, primary_key=True, default=generate_uuid)
    user_id = Column(types.Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    token_expiry = Column(DateTime(timezone=True), nullable=True)
    is_connected = Column(Boolean, default=True)

    user = relationship("User")
