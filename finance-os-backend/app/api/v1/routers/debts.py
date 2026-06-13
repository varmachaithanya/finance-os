from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.debt import (
    DebtCreate,
    DebtListResponse,
    DebtPaymentRequest,
    DebtResponse,
    DebtSummaryResponse,
    DebtUpdate,
    PayoffPlanResponse,
)
from app.services.debt_service import DebtService

router = APIRouter(prefix="/debts", tags=["Debts"])


@router.get("", summary="List debts")
def list_debts(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    debt_type: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DebtListResponse:
    service = DebtService(db)
    items, total = service.get_debts(
        user_id=str(current_user.id),
        page=page,
        limit=limit,
        debt_type=debt_type,
        status=status,
    )
    pages = (total + limit - 1) // limit
    return DebtListResponse(
        data=[DebtResponse.model_validate(d) for d in items],
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )


@router.post("", summary="Create debt", status_code=201)
def create_debt(
    body: DebtCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DebtResponse:
    service = DebtService(db)
    debt = service.create(
        user_id=str(current_user.id),
        lender_name=body.lender_name,
        debt_type=body.debt_type,
        total_amount=body.total_amount,
        paid_amount=body.paid_amount,
        emi_amount=body.emi_amount,
        interest_rate=body.interest_rate,
        due_date=body.due_date,
        start_date=body.start_date,
        notes=body.notes,
    )
    return DebtResponse.model_validate(debt)


@router.get("/summary", summary="Debt summary")
def debt_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DebtSummaryResponse:
    service = DebtService(db)
    return service.get_summary(str(current_user.id))


@router.get("/payoff-plan", summary="Debt payoff plan")
def payoff_plan(
    strategy: str = Query("snowball", pattern="^(snowball|avalanche)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PayoffPlanResponse:
    service = DebtService(db)
    return service.get_payoff_plan(str(current_user.id), strategy)


@router.get("/{id}", summary="Get debt by ID")
def get_debt(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DebtResponse:
    service = DebtService(db)
    debt = service.get_by_id(id, str(current_user.id))
    return DebtResponse.model_validate(debt)


@router.put("/{id}", summary="Update debt")
def update_debt(
    id: str,
    body: DebtUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DebtResponse:
    service = DebtService(db)
    kwargs = body.model_dump(exclude_none=True)
    debt = service.update(id, str(current_user.id), **kwargs)
    return DebtResponse.model_validate(debt)


@router.delete("/{id}", summary="Delete debt")
def delete_debt(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    service = DebtService(db)
    service.delete(id, str(current_user.id))
    return {"message": "Debt deleted successfully"}


@router.patch("/{id}/payment", summary="Record debt payment")
def record_payment(
    id: str,
    body: DebtPaymentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DebtResponse:
    service = DebtService(db)
    debt = service.record_payment(id, str(current_user.id), body.amount)
    return DebtResponse.model_validate(debt)
