import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, field_validator


class BudgetCreate(BaseModel):
    category_id: str
    budget_amount: Decimal
    period: str = "monthly"
    month: Optional[int] = None
    year: Optional[int] = None

    @field_validator("budget_amount")
    @classmethod
    def amount_positive(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Budget amount must be positive")
        return v


class BudgetUpdate(BaseModel):
    budget_amount: Optional[Decimal] = None
    period: Optional[str] = None
    month: Optional[int] = None
    year: Optional[int] = None


class BudgetResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    category_id: uuid.UUID
    budget_amount: Decimal
    period: str
    month: Optional[int] = None
    year: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BudgetListResponse(BaseModel):
    data: list[BudgetResponse]
    total: int
    page: int
    limit: int
    pages: int


class BudgetVsActualItem(BaseModel):
    category_id: str
    category_name: str
    budget: Decimal
    spent: Decimal
    remaining: Decimal
    pct_used: float


class BudgetVsActualResponse(BaseModel):
    data: list[BudgetVsActualItem]
    month: int
    year: int


class BudgetAlert(BaseModel):
    category_id: str
    category_name: str
    budget: Decimal
    spent: Decimal
    pct_used: float
