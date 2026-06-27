from sqlalchemy import Column, ForeignKey, Integer, Numeric, String, types
from sqlalchemy.orm import relationship
from app.models.base import Base, TimestampMixin, generate_uuid


class SpendingPrediction(Base, TimestampMixin):
    __tablename__ = "spending_predictions"

    id = Column(types.Uuid, primary_key=True, default=generate_uuid)
    user_id = Column(types.Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id = Column(types.Uuid, ForeignKey("categories.id"), nullable=True)
    category_name = Column(String(100), nullable=False)
    current_average = Column(Numeric(12, 2), nullable=False)
    predicted_amount = Column(Numeric(12, 2), nullable=False)
    confidence_score = Column(Numeric(5, 2), nullable=False)
    growth_rate = Column(Numeric(10, 4), nullable=True)
    month = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)

    user = relationship("User", backref="spending_predictions")
