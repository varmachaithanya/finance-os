from datetime import date, datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.repositories.base import BaseRepository, to_uuid


class NotificationRepository(BaseRepository[Notification]):
    def __init__(self, db: Session):
        super().__init__(Notification, db)

    def get_by_user(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 50,
        is_read: Optional[bool] = None,
        type: Optional[str] = None,
    ) -> tuple[list[Notification], int]:
        query = self.db.query(Notification).filter(Notification.user_id == to_uuid(user_id))
        if is_read is not None:
            query = query.filter(Notification.is_read == is_read)
        if type:
            query = query.filter(Notification.type == type)
        total = query.count()
        items = query.order_by(Notification.created_at.desc()).offset(skip).limit(limit).all()
        return items, total

    def get_unread_count(self, user_id: str) -> int:
        return (
            self.db.query(Notification)
            .filter(Notification.user_id == to_uuid(user_id), Notification.is_read == False)
            .count()
        )

    def mark_read(self, id: str, user_id: str) -> Optional[Notification]:
        notif = self.db.query(Notification).filter(
            Notification.id == to_uuid(id), Notification.user_id == to_uuid(user_id)
        ).first()
        if not notif:
            return None
        notif.is_read = True
        self.db.commit()
        self.db.refresh(notif)
        return notif

    def mark_all_read(self, user_id: str) -> None:
        self.db.query(Notification).filter(
            Notification.user_id == to_uuid(user_id), Notification.is_read == False
        ).update({"is_read": True})
        self.db.commit()


class NotificationService:
    def __init__(self, db: Session):
        self.repo = NotificationRepository(db)

    def get_notifications(
        self,
        user_id: str,
        page: int = 1,
        limit: int = 50,
        is_read: Optional[bool] = None,
        type: Optional[str] = None,
    ) -> tuple[list[Notification], int]:
        skip = (page - 1) * limit
        return self.repo.get_by_user(user_id, skip, limit, is_read, type)

    def get_unread_count(self, user_id: str) -> int:
        return self.repo.get_unread_count(user_id)

    def mark_read(self, id: str, user_id: str) -> Notification:
        notif = self.repo.mark_read(id, user_id)
        if not notif:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
        return notif

    def mark_all_read(self, user_id: str) -> None:
        self.repo.mark_all_read(user_id)

    def delete(self, id: str, user_id: str) -> None:
        notif = self.repo.get(id)
        if not notif or str(notif.user_id) != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
        self.repo.delete(id)

    def create_notification(
        self,
        user_id: str,
        type: str,
        title: str,
        message: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
    ) -> Notification:
        return self.repo.create(
            user_id=user_id,
            type=type,
            title=title,
            message=message,
            entity_type=entity_type,
            entity_id=entity_id,
        )
