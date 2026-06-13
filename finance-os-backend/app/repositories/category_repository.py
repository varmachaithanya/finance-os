from typing import Optional
from sqlalchemy.orm import Session

from app.models.category import Category
from app.repositories.base import BaseRepository, to_uuid


class CategoryRepository(BaseRepository[Category]):
    def __init__(self, db: Session):
        super().__init__(Category, db)

    def get_defaults(self, type: Optional[str] = None) -> list[Category]:
        query = self.db.query(Category).filter(Category.is_default == True)
        if type:
            query = query.filter(Category.type == type)
        return query.all()

    def get_user_categories(self, user_id: str, type: Optional[str] = None) -> list[Category]:
        query = self.db.query(Category).filter(
            (Category.user_id == to_uuid(user_id)) | (Category.is_default == True)
        )
        if type:
            query = query.filter(Category.type == type)
        return query.all()

    def get_by_name_and_user(self, name: str, user_id: Optional[str] = None) -> Optional[Category]:
        if user_id:
            return self.db.query(Category).filter(
                Category.name == name,
                (Category.user_id == to_uuid(user_id)) | (Category.is_default == True),
            ).first()
        return self.db.query(Category).filter(Category.name == name, Category.is_default == True).first()
