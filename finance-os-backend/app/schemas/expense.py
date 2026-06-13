import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, field_validator


class ExpenseCreate(BaseModel):
    amount: Decimal
    category_id: Optional[str] = None
    description: Optional[str] = None
    payment_method: Optional[str] = None
    expense_date: date
    is_recurring: bool = False

    @field_validator("amount")
    @classmethod
    def amount_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Amount must be positive")
        return v


class ExpenseUpdate(BaseModel):
    amount: Optional[Decimal] = None
    category_id: Optional[str] = None
    description: Optional[str] = None
    payment_method: Optional[str] = None
    expense_date: Optional[date] = None
    is_recurring: Optional[bool] = None


class ExpenseBulkCreate(BaseModel):
    expenses: list[ExpenseCreate]


class ExpenseResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    category_id: Optional[uuid.UUID] = None
    amount: Decimal
    description: Optional[str] = None
    payment_method: Optional[str] = None
    expense_date: date
    is_recurring: bool = False
    ai_category_suggestion: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ExpenseListResponse(BaseModel):
    data: list[ExpenseResponse]
    total: int
    page: int
    limit: int
    pages: int


class ExpenseSummaryItem(BaseModel):
    category_id: Optional[str] = None
    category_name: Optional[str] = None
    total: Decimal
    count: int


class ExpenseSummaryResponse(BaseModel):
    data: list[ExpenseSummaryItem]
    total_amount: Decimal
    month: int
    year: int


class AISuggestionResponse(BaseModel):
    suggested_category: Optional[str] = None
