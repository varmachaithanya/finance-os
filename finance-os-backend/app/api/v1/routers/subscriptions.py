from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.subscription import (
    MonthlyCostResponse,
    SubscriptionCreate,
    SubscriptionListResponse,
    SubscriptionResponse,
    SubscriptionUpdate,
    UpcomingRenewalListResponse,
)
from app.services.subscription_service import SubscriptionService

router = APIRouter(prefix="/subscriptions", tags=["Subscriptions"])


@router.get("", summary="List subscriptions")
def list_subscriptions(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    is_active: Optional[bool] = Query(None),
    billing_cycle: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SubscriptionListResponse:
    service = SubscriptionService(db)
    items, total = service.get_subscriptions(
        user_id=str(current_user.id),
        page=page,
        limit=limit,
        is_active=is_active,
        billing_cycle=billing_cycle,
    )
    pages = (total + limit - 1) // limit
    return SubscriptionListResponse(
        data=[SubscriptionResponse.model_validate(s) for s in items],
        total=total,
        page=page,
        limit=limit,
        pages=pages,
    )


@router.post("", summary="Create subscription", status_code=201)
def create_subscription(
    body: SubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SubscriptionResponse:
    service = SubscriptionService(db)
    sub = service.create(
        user_id=str(current_user.id),
        service_name=body.service_name,
        category=body.category,
        amount=body.amount,
        billing_cycle=body.billing_cycle,
        renewal_date=body.renewal_date,
        auto_renewal=body.auto_renewal,
        notes=body.notes,
    )
    return SubscriptionResponse.model_validate(sub)


@router.get("/upcoming", summary="Upcoming renewals")
def upcoming_renewals(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UpcomingRenewalListResponse:
    service = SubscriptionService(db)
    data = service.get_upcoming(str(current_user.id), days)
    return UpcomingRenewalListResponse(data=data)


@router.get("/monthly-cost", summary="Monthly subscription cost")
def monthly_cost(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MonthlyCostResponse:
    service = SubscriptionService(db)
    return service.get_monthly_cost(str(current_user.id))


@router.get("/{id}", summary="Get subscription by ID")
def get_subscription(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SubscriptionResponse:
    service = SubscriptionService(db)
    sub = service.get_by_id(id, str(current_user.id))
    return SubscriptionResponse.model_validate(sub)


@router.put("/{id}", summary="Update subscription")
def update_subscription(
    id: str,
    body: SubscriptionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SubscriptionResponse:
    service = SubscriptionService(db)
    kwargs = body.model_dump(exclude_none=True)
    sub = service.update(id, str(current_user.id), **kwargs)
    return SubscriptionResponse.model_validate(sub)


@router.delete("/{id}", summary="Delete subscription")
def delete_subscription(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    service = SubscriptionService(db)
    service.delete(id, str(current_user.id))
    return {"message": "Subscription deleted successfully"}


@router.patch("/{id}/toggle", summary="Toggle subscription active status")
def toggle_subscription(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SubscriptionResponse:
    service = SubscriptionService(db)
    sub = service.toggle_active(id, str(current_user.id))
    return SubscriptionResponse.model_validate(sub)
