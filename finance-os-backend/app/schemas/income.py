import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, field_validator


class IncomeCreate(BaseModel):
    source: str
    amount: Decimal
    description: Optional[str] = None
    income_date: date
    is_recurring: bool = False

    @field_validator("amount")
    @classmethod
    def amount_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Amount must be positive")
        return v


class IncomeUpdate(BaseModel):
    source: Optional[str] = None
    amount: Optional[Decimal] = None
    description: Optional[str] = None
    income_date: Optional[date] = None
    is_recurring: Optional[bool] = None


class IncomeResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    source: str
    amount: Decimal
    description: Optional[str] = None
    income_date: date
    is_recurring: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class IncomeListResponse(BaseModel):
    data: list[IncomeResponse]
    total: int
    page: int
    limit: int
    pages: int


class IncomeSummaryItem(BaseModel):
    source: str
    total: Decimal
    count: int


class IncomeSummaryResponse(BaseModel):
    data: list[IncomeSummaryItem]
    total_amount: Decimal
    month: int
    year: int
