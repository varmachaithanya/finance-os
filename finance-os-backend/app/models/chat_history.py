from sqlalchemy import Column, ForeignKey, String, Text, types
from sqlalchemy.orm import relationship
from app.models.base import Base, TimestampMixin, generate_uuid


class ChatHistory(Base, TimestampMixin):
    __tablename__ = "chat_history"

    id = Column(types.Uuid, primary_key=True, default=generate_uuid)
    user_id = Column(types.Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    intent = Column(String(50), nullable=True)
    provider = Column(String(20), nullable=True)

    user = relationship("User", backref="chat_history")
