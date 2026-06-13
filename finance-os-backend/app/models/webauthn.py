import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text, types
from sqlalchemy.orm import relationship

from app.models.base import Base, TimestampMixin, generate_uuid


class WebAuthnCredential(Base, TimestampMixin):
    __tablename__ = "webauthn_credentials"

    id = Column(types.Uuid, primary_key=True, default=generate_uuid)
    user_id = Column(types.Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    credential_id = Column(String(500), nullable=False, unique=True)
    public_key = Column(Text, nullable=False)
    device_name = Column(String(100), nullable=True)
    sign_count = Column(types.Integer, default=0)

    user = relationship("User", backref="webauthn_credentials")


class WebAuthnChallenge(Base):
    __tablename__ = "webauthn_challenges"

    id = Column(types.Uuid, primary_key=True, default=generate_uuid)
    user_id = Column(types.Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    challenge = Column(String(200), nullable=False)
    purpose = Column(String(20), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
