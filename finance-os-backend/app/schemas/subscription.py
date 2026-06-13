import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, field_validator


class SubscriptionCreate(BaseModel):
    service_name: str
    category: Optional[str] = None
    amount: Decimal
    billing_cycle: str = "monthly"
    renewal_date: date
    auto_renewal: bool = True
    notes: Optional[str] = None

    @field_validator("amount")
    @classmethod
    def amount_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Amount must be positive")
        return v


class SubscriptionUpdate(BaseModel):
    service_name: Optional[str] = None
    category: Optional[str] = None
    amount: Optional[Decimal] = None
    billing_cycle: Optional[str] = None
    renewal_date: Optional[date] = None
    auto_renewal: Optional[bool] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class SubscriptionResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    service_name: str
    category: Optional[str] = None
    amount: Decimal
    billing_cycle: str
    renewal_date: date
    auto_renewal: bool = True
    is_active: bool = True
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SubscriptionListResponse(BaseModel):
    data: list[SubscriptionResponse]
    total: int
    page: int
    limit: int
    pages: int


class UpcomingRenewal(BaseModel):
    id: str
    service_name: str
    amount: Decimal
    renewal_date: date
    days_remaining: int


class UpcomingRenewalListResponse(BaseModel):
    data: list[UpcomingRenewal]


class MonthlyCostByCategory(BaseModel):
    category: str
    monthly_cost: Decimal


class MonthlyCostResponse(BaseModel):
    total_monthly_cost: Decimal
    by_category: list[MonthlyCostByCategory]
