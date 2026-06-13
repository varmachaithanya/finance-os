import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, field_validator


class DebtCreate(BaseModel):
    lender_name: str
    debt_type: str
    total_amount: Decimal
    paid_amount: Decimal = 0
    emi_amount: Optional[Decimal] = None
    interest_rate: Optional[Decimal] = None
    due_date: Optional[date] = None
    start_date: Optional[date] = None
    notes: Optional[str] = None

    @field_validator("total_amount")
    @classmethod
    def amount_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Total amount must be positive")
        return v


class DebtUpdate(BaseModel):
    lender_name: Optional[str] = None
    debt_type: Optional[str] = None
    total_amount: Optional[Decimal] = None
    emi_amount: Optional[Decimal] = None
    interest_rate: Optional[Decimal] = None
    due_date: Optional[date] = None
    start_date: Optional[date] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class DebtPaymentRequest(BaseModel):
    amount: Decimal

    @field_validator("amount")
    @classmethod
    def amount_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Payment amount must be positive")
        return v


class DebtResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    lender_name: str
    debt_type: str
    total_amount: Decimal
    paid_amount: Decimal = Decimal("0")
    remaining_amount: Decimal
    emi_amount: Optional[Decimal] = None
    interest_rate: Optional[Decimal] = None
    due_date: Optional[date] = None
    start_date: Optional[date] = None
    status: str = "active"
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DebtListResponse(BaseModel):
    data: list[DebtResponse]
    total: int
    page: int
    limit: int
    pages: int


class DebtSummaryResponse(BaseModel):
    total_owed: Decimal
    total_paid: Decimal
    total_remaining: Decimal
    active_count: int


class PayoffPlanItem(BaseModel):
    debt_id: str
    lender_name: str
    total_amount: Decimal
    remaining_amount: Decimal
    interest_rate: Optional[Decimal] = None
    estimated_months: int
    monthly_payment: Decimal


class PayoffPlanResponse(BaseModel):
    strategy: str
    debts: list[PayoffPlanItem]
