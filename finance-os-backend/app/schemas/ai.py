from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel


class CategoryPrediction(BaseModel):
    category_id: Optional[str] = None
    category_name: str
    current_average: Decimal
    predicted_amount: Decimal
    confidence_score: Decimal
    growth_rate: Optional[Decimal] = None


class PredictionResponse(BaseModel):
    predictions: list[CategoryPrediction]
    next_month: int
    next_year: int
    generated_at: datetime


class SavingSuggestion(BaseModel):
    type: str
    title: str
    description: str
    priority: str
    monthly_savings: Decimal
    yearly_savings: Decimal
    category: Optional[str] = None


class SavingsResponse(BaseModel):
    suggestions: list[SavingSuggestion]
    total_monthly_savings: Decimal
    total_yearly_savings: Decimal


class AnomalyItem(BaseModel):
    id: str
    type: str
    severity: str
    title: str
    message: str
    amount: Optional[Decimal] = None
    category_name: Optional[str] = None
    merchant: Optional[str] = None
    is_resolved: bool
    created_at: datetime


class AnomalyListResponse(BaseModel):
    anomalies: list[AnomalyItem]
    total: int
    unread_count: int


class EMIRequest(BaseModel):
    loan_amount: Decimal
    interest_rate: float
    tenure_months: int


class EMIScheduleRow(BaseModel):
    month: int
    emi: Decimal
    principal: Decimal
    interest: Decimal
    balance: Decimal


class EMIResponse(BaseModel):
    monthly_emi: Decimal
    total_interest: Decimal
    total_payment: Decimal
    loan_amount: Decimal
    interest_rate: float
    tenure_months: int
    amortization_schedule: list[EMIScheduleRow]
    principal_percentage: float
    interest_percentage: float


class DebtPayoffPlan(BaseModel):
    strategy: str
    months_to_debt_free: int
    total_interest_paid: Decimal
    total_principal: Decimal
    total_saved: Decimal
    schedule: list[dict]


class DebtPayoffResponse(BaseModel):
    snowball: DebtPayoffPlan
    avalanche: DebtPayoffPlan
    best_strategy: str
    interest_saved: Decimal


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    answer: str
    intent: str
    recommendations: list[str] = []


class ChatHistoryItem(BaseModel):
    id: str
    question: str
    answer: str
    intent: Optional[str] = None
    provider: Optional[str] = None
    created_at: datetime


class AIHealthResponse(BaseModel):
    model: str
    api_key_loaded: bool
    api_key_prefix: str
    connectivity: bool
    fallback_active: bool
    provider: str
    quota_exceeded: bool
    last_error: Optional[str] = None
