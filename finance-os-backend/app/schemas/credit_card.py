import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, field_validator


class CreditCardCreate(BaseModel):
    bank_name: str
    card_name: str
    last_four_digits: Optional[str] = None
    credit_limit: Decimal
    outstanding_balance: Decimal = 0
    minimum_due: Decimal = 0
    due_date: Optional[date] = None

    @field_validator("credit_limit")
    @classmethod
    def limit_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Credit limit must be positive")
        return v


class CreditCardUpdate(BaseModel):
    bank_name: Optional[str] = None
    card_name: Optional[str] = None
    last_four_digits: Optional[str] = None
    credit_limit: Optional[Decimal] = None
    outstanding_balance: Optional[Decimal] = None
    minimum_due: Optional[Decimal] = None
    due_date: Optional[date] = None
    is_active: Optional[bool] = None


class CreditCardResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    bank_name: str
    card_name: str
    last_four_digits: Optional[str] = None
    credit_limit: Decimal
    outstanding_balance: Decimal
    minimum_due: Decimal
    due_date: Optional[date] = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CreditCardListResponse(BaseModel):
    data: list[CreditCardResponse]
    total: int
    page: int
    limit: int
    pages: int


class UtilizationResponse(BaseModel):
    card_id: str
    card_name: str
    bank_name: str
    utilization_pct: float
    status: str


class UtilizationListResponse(BaseModel):
    data: list[UtilizationResponse]


class DueAlert(BaseModel):
    card_id: str
    card_name: str
    bank_name: str
    due_date: date
    minimum_due: Decimal
    days_remaining: int


class DueAlertListResponse(BaseModel):
    data: list[DueAlert]
