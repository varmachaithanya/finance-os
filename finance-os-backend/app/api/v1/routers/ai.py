from datetime import datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.ai import (
    PredictionResponse, SavingsResponse, AnomalyListResponse,
    EMIRequest, EMIResponse, DebtPayoffResponse,
)
from app.services.prediction_service import PredictionService
from app.services.savings_service import SavingsRecommendationEngine
from app.services.anomaly_service import AnomalyDetectionService
from app.services.emi_calculator import calculate_emi
from app.services.debt_optimizer import DebtOptimizerService

router = APIRouter(prefix="/ai", tags=["AI Features"])


@router.get("/predictions", summary="Get expense predictions for next month")
def get_predictions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PredictionResponse:
    service = PredictionService(db)
    predictions = service.generate_predictions(str(current_user.id))
    today = datetime.utcnow()
    next_month = today.month + 1 if today.month < 12 else 1
    next_year = today.year if today.month < 12 else today.year + 1
    return PredictionResponse(
        predictions=predictions[:10],
        next_month=next_month,
        next_year=next_year,
        generated_at=today,
    )


@router.get("/savings-suggestions", summary="Get personalized savings suggestions")
def get_savings_suggestions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SavingsResponse:
    engine = SavingsRecommendationEngine(db)
    suggestions = engine.generate(str(current_user.id))
    total_monthly = sum(s.monthly_savings for s in suggestions)
    total_yearly = sum(s.yearly_savings for s in suggestions)
    return SavingsResponse(
        suggestions=suggestions,
        total_monthly_savings=total_monthly,
        total_yearly_savings=total_yearly,
    )


@router.get("/anomalies", summary="Detect spending anomalies")
def get_anomalies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AnomalyListResponse:
    service = AnomalyDetectionService(db)
    anomalies = service.detect(str(current_user.id))
    unread_count = service.unread_count(str(current_user.id))
    return AnomalyListResponse(
        anomalies=anomalies,
        total=len(anomalies),
        unread_count=unread_count,
    )


@router.get("/anomalies/list", summary="List unresolved anomalies")
def list_anomalies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AnomalyListResponse:
    service = AnomalyDetectionService(db)
    anomalies = service.get_alerts(str(current_user.id))
    unread_count = service.unread_count(str(current_user.id))
    return AnomalyListResponse(
        anomalies=anomalies,
        total=len(anomalies),
        unread_count=unread_count,
    )


@router.post("/anomalies/{alert_id}/resolve", summary="Resolve an anomaly alert")
def resolve_anomaly(
    alert_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    service = AnomalyDetectionService(db)
    service.resolve(str(current_user.id), alert_id)
    return {"success": True, "message": "Anomaly resolved"}


@router.get("/anomalies/count", summary="Get unread anomaly count")
def anomaly_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    service = AnomalyDetectionService(db)
    count = service.unread_count(str(current_user.id))
    return {"unread_count": count}


@router.post("/emi-calculate", summary="Calculate EMI with amortization schedule")
def emi_calculate(
    req: EMIRequest,
) -> EMIResponse:
    return calculate_emi(req)


@router.get("/debt-payoff-plan", summary="Generate debt payoff strategy")
def debt_payoff_plan(
    monthly_budget: float = Query(default=0, description="Optional monthly budget for debt payments"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DebtPayoffResponse:
    service = DebtOptimizerService(db)
    return service.generate_plan(str(current_user.id), monthly_budget)
