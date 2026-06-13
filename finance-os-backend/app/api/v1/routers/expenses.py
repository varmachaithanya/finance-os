from datetime import date
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.expense import (
    AISuggestionResponse,
    ExpenseBulkCreate,
    ExpenseCreate,
    ExpenseListResponse,
    ExpenseResponse,
    ExpenseSummaryResponse,
    ExpenseUpdate,
)
from app.services.expense_service import ExpenseService

router = APIRouter(prefix="/expenses", tags=["Expenses"])


@router.get("", summary="List expenses")
def list_expenses(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sort: str = Query("expense_date"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    search: Optional[str] = Query(None),
    category_id: Optional[str] = Query(None),
    payment_method: Optional[str] = Query(None),
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExpenseListResponse:
    service = ExpenseService(db)
    items, total = service.get_expenses(
        user_id=str(current_user.id),
        page=page,
        limit=limit,
        sort=sort,
        order=order,
        search=search,
        category_id=category_id,
        payment_method=payment_method,
        from_date=from_date,
        to_date=to_date,
    )
    pages = (total + limit - 1) // limit
    return ExpenseListResponse(
        data=[ExpenseResponse.model_validate(e) for e in items],
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )


@router.post("", summary="Create expense", status_code=201)
def create_expense(
    body: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExpenseResponse:
    service = ExpenseService(db)
    expense = service.create(
        user_id=str(current_user.id),
        amount=body.amount,
        category_id=body.category_id,
        description=body.description,
        payment_method=body.payment_method,
        expense_date=body.expense_date,
        is_recurring=body.is_recurring,
    )
    return ExpenseResponse.model_validate(expense)


@router.get("/summary", summary="Expense summary by category")
def expense_summary(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2020),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExpenseSummaryResponse:
    service = ExpenseService(db)
    return service.get_summary(str(current_user.id), month, year)


@router.get("/ai-suggest", summary="AI category suggestion")
def ai_suggest(
    description: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AISuggestionResponse:
    service = ExpenseService(db)
    return service.ai_suggest(description)


@router.post("/bulk", summary="Bulk create expenses", status_code=201)
def bulk_create(
    body: ExpenseBulkCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ExpenseResponse]:
    service = ExpenseService(db)
    data = [e.model_dump() for e in body.expenses]
    expenses = service.bulk_create(str(current_user.id), data)
    return [ExpenseResponse.model_validate(e) for e in expenses]


@router.get("/{id}", summary="Get expense by ID")
def get_expense(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExpenseResponse:
    service = ExpenseService(db)
    expense = service.get_by_id(id, str(current_user.id))
    return ExpenseResponse.model_validate(expense)


@router.put("/{id}", summary="Update expense")
def update_expense(
    id: str,
    body: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExpenseResponse:
    service = ExpenseService(db)
    kwargs = body.model_dump(exclude_none=True)
    expense = service.update(id, str(current_user.id), **kwargs)
    return ExpenseResponse.model_validate(expense)


@router.delete("/{id}", summary="Delete expense")
def delete_expense(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    service = ExpenseService(db)
    service.delete(id, str(current_user.id))
    return {"message": "Expense deleted successfully"}
