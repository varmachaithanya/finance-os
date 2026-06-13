from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.budget import (
    BudgetCreate,
    BudgetListResponse,
    BudgetResponse,
    BudgetUpdate,
    BudgetVsActualResponse,
)
from app.services.budget_service import BudgetService

router = APIRouter(prefix="/budgets", tags=["Budgets"])


@router.get("", summary="List budgets")
def list_budgets(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BudgetListResponse:
    service = BudgetService(db)
    items, total = service.get_budgets(
        user_id=str(current_user.id),
        month=month,
        year=year,
        page=page,
        limit=limit,
    )
    pages = (total + limit - 1) // limit
    return BudgetListResponse(
        data=[BudgetResponse.model_validate(b) for b in items],
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )


@router.post("", summary="Create budget", status_code=201)
def create_budget(
    body: BudgetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BudgetResponse:
    service = BudgetService(db)
    budget = service.create(
        user_id=str(current_user.id),
        category_id=body.category_id,
        budget_amount=body.budget_amount,
        period=body.period,
        month=body.month,
        year=body.year,
    )
    return BudgetResponse.model_validate(budget)


@router.get("/vs-actual", summary="Budget vs actual spending")
def vs_actual(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BudgetVsActualResponse:
    service = BudgetService(db)
    return service.get_vs_actual(str(current_user.id), month, year)


@router.get("/alerts", summary="Budget alerts (spent > 80%)")
def budget_alerts(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[dict]:
    service = BudgetService(db)
    return service.get_alerts(str(current_user.id), month, year)


@router.put("/{id}", summary="Update budget")
def update_budget(
    id: str,
    body: BudgetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BudgetResponse:
    service = BudgetService(db)
    kwargs = body.model_dump(exclude_none=True)
    budget = service.update(id, str(current_user.id), **kwargs)
    return BudgetResponse.model_validate(budget)


@router.delete("/{id}", summary="Delete budget")
def delete_budget(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    service = BudgetService(db)
    service.delete(id, str(current_user.id))
    return {"message": "Budget deleted successfully"}
