from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("")
def list_notifications(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    is_read: Optional[bool] = Query(None),
    type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    service = NotificationService(db)
    items, total = service.get_notifications(
        str(current_user.id), page, limit, is_read, type
    )
    pages = (total + limit - 1) // limit
    return {
        "data": [
            {
                "id": str(n.id),
                "type": n.type,
                "title": n.title,
                "message": n.message,
                "entity_type": n.entity_type,
                "entity_id": str(n.entity_id) if n.entity_id else None,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat() if n.created_at else None,
            }
            for n in items
        ],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": pages,
    }


@router.get("/count")
def notification_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    service = NotificationService(db)
    count = service.get_unread_count(str(current_user.id))
    return {"unread_count": count}


@router.patch("/{id}/read")
def mark_read(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    service = NotificationService(db)
    service.mark_read(id, str(current_user.id))
    return {"message": "Notification marked as read"}


@router.patch("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    service = NotificationService(db)
    service.mark_all_read(str(current_user.id))
    return {"message": "All notifications marked as read"}


@router.delete("/{id}")
def delete_notification(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    service = NotificationService(db)
    service.delete(id, str(current_user.id))
    return {"message": "Notification deleted"}
