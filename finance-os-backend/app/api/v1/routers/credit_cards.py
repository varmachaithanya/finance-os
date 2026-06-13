from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.credit_card import (
    CreditCardCreate,
    CreditCardListResponse,
    CreditCardResponse,
    CreditCardUpdate,
    DueAlertListResponse,
    UtilizationListResponse,
)
from app.services.credit_card_service import CreditCardService

router = APIRouter(prefix="/credit-cards", tags=["Credit Cards"])


@router.get("", summary="List credit cards")
def list_cards(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CreditCardListResponse:
    service = CreditCardService(db)
    cards = service.get_all(str(current_user.id))
    return CreditCardListResponse(
        data=[CreditCardResponse.model_validate(c) for c in cards],
        total=len(cards),
        page=1,
        limit=len(cards),
        pages=1,
    )


@router.post("", summary="Add credit card", status_code=201)
def create_card(
    body: CreditCardCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CreditCardResponse:
    service = CreditCardService(db)
    card = service.create(
        user_id=str(current_user.id),
        bank_name=body.bank_name,
        card_name=body.card_name,
        last_four_digits=body.last_four_digits,
        credit_limit=body.credit_limit,
        outstanding_balance=body.outstanding_balance,
        minimum_due=body.minimum_due,
        due_date=body.due_date,
    )
    return CreditCardResponse.model_validate(card)


@router.get("/utilization", summary="Credit card utilization")
def utilization(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UtilizationListResponse:
    service = CreditCardService(db)
    data = service.get_utilization(str(current_user.id))
    return UtilizationListResponse(data=data)


@router.get("/due-alerts", summary="Upcoming due alerts")
def due_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DueAlertListResponse:
    service = CreditCardService(db)
    data = service.get_due_alerts(str(current_user.id))
    return DueAlertListResponse(data=data)


@router.get("/{id}", summary="Get credit card by ID")
def get_card(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CreditCardResponse:
    service = CreditCardService(db)
    card = service.get_by_id(id, str(current_user.id))
    return CreditCardResponse.model_validate(card)


@router.put("/{id}", summary="Update credit card")
def update_card(
    id: str,
    body: CreditCardUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CreditCardResponse:
    service = CreditCardService(db)
    kwargs = body.model_dump(exclude_none=True)
    card = service.update(id, str(current_user.id), **kwargs)
    return CreditCardResponse.model_validate(card)


@router.delete("/{id}", summary="Delete credit card")
def delete_card(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    service = CreditCardService(db)
    service.delete(id, str(current_user.id))
    return {"message": "Credit card deleted successfully"}
