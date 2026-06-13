import uuid
from typing import Any, Generic, Optional, TypeVar

from sqlalchemy import types
from sqlalchemy.orm import Session

from app.models.base import Base

ModelType = TypeVar("ModelType", bound=Base)


def to_uuid(value: Any) -> Any:
    if isinstance(value, str):
        try:
            return uuid.UUID(value)
        except (ValueError, AttributeError):
            pass
    return value


class BaseRepository(Generic[ModelType]):
    def __init__(self, model: type[ModelType], db: Session):
        self.model = model
        self.db = db

    def create(self, **kwargs: Any) -> ModelType:
        for key, value in kwargs.items():
            if isinstance(value, str) and hasattr(self.model, key):
                col = getattr(self.model, key)
                if hasattr(col, 'type') and isinstance(col.type, types.Uuid):
                    kwargs[key] = uuid.UUID(value)
        instance = self.model(**kwargs)
        self.db.add(instance)
        self.db.commit()
        self.db.refresh(instance)
        return instance

    def get(self, id: Any) -> Optional[ModelType]:
        return self.db.query(self.model).filter(self.model.id == to_uuid(id)).first()

    def get_multi(
        self,
        skip: int = 0,
        limit: int = 20,
        sort: str = "created_at",
        order: str = "desc",
        **filters: Any,
    ) -> tuple[list[ModelType], int]:
        query = self.db.query(self.model)
        for field, value in filters.items():
            if value is not None:
                if hasattr(self.model, field):
                    query = query.filter(getattr(self.model, field) == to_uuid(value))
        total = query.count()
        sort_column = getattr(self.model, sort, None)
        if sort_column is not None:
            query = query.order_by(sort_column.desc() if order == "desc" else sort_column.asc())
        items = query.offset(skip).limit(limit).all()
        return items, total

    def update(self, id: Any, **kwargs: Any) -> Optional[ModelType]:
        instance = self.get(id)
        if instance is None:
            return None
        for key, value in kwargs.items():
            if value is not None and hasattr(instance, key):
                col = getattr(self.model, key)
                if isinstance(value, str) and hasattr(col, 'type') and isinstance(col.type, types.Uuid):
                    value = uuid.UUID(value)
                setattr(instance, key, value)
        self.db.commit()
        self.db.refresh(instance)
        return instance

    def delete(self, id: Any) -> bool:
        instance = self.get(id)
        if instance is None:
            return False
        self.db.delete(instance)
        self.db.commit()
        return True
