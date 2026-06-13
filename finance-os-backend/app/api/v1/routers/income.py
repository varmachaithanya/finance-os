from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.income import (
    IncomeCreate,
    IncomeListResponse,
    IncomeResponse,
    IncomeSummaryResponse,
    IncomeUpdate,
)
from app.services.income_service import IncomeService

router = APIRouter(prefix="/income", tags=["Income"])


@router.get("", summary="List income entries")
def list_income(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sort: str = Query("income_date"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    search: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> IncomeListResponse:
    service = IncomeService(db)
    items, total = service.get_income(
        user_id=str(current_user.id),
        page=page,
        limit=limit,
        sort=sort,
        order=order,
        search=search,
        source=source,
        from_date=from_date,
        to_date=to_date,
    )
    pages = (total + limit - 1) // limit
    return IncomeListResponse(
        data=[IncomeResponse.model_validate(e) for e in items],
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )


@router.post("", summary="Create income entry", status_code=201)
def create_income(
    body: IncomeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> IncomeResponse:
    service = IncomeService(db)
    income = service.create(
        user_id=str(current_user.id),
        source=body.source,
        amount=body.amount,
        description=body.description,
        income_date=body.income_date,
        is_recurring=body.is_recurring,
    )
    return IncomeResponse.model_validate(income)


@router.get("/summary", summary="Income summary by source")
def income_summary(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> IncomeSummaryResponse:
    service = IncomeService(db)
    return service.get_summary(str(current_user.id), month, year)


@router.get("/{id}", summary="Get income by ID")
def get_income(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> IncomeResponse:
    service = IncomeService(db)
    income = service.get_by_id(id, str(current_user.id))
    return IncomeResponse.model_validate(income)


@router.put("/{id}", summary="Update income entry")
def update_income(
    id: str,
    body: IncomeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> IncomeResponse:
    service = IncomeService(db)
    kwargs = body.model_dump(exclude_none=True)
    income = service.update(id, str(current_user.id), **kwargs)
    return IncomeResponse.model_validate(income)


@router.delete("/{id}", summary="Delete income entry")
def delete_income(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    service = IncomeService(db)
    service.delete(id, str(current_user.id))
    return {"message": "Income deleted successfully"}
