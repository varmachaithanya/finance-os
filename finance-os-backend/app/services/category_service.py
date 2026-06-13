from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.category import Category
from app.repositories.category_repository import CategoryRepository


class CategoryService:
    def __init__(self, db: Session):
        self.repo = CategoryRepository(db)

    def get_categories(self, user_id: str, type: Optional[str] = None) -> list[Category]:
        return self.repo.get_user_categories(user_id, type)

    def create(self, user_id: str, name: str, type: str, icon: Optional[str] = None, color: Optional[str] = None) -> Category:
        existing = self.repo.get_by_name_and_user(name, user_id)
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category already exists")
        return self.repo.create(user_id=user_id, name=name, type=type, icon=icon, color=color)

    def update(self, id: str, user_id: str, **kwargs) -> Category:
        cat = self.repo.get(id)
        if not cat or (str(cat.user_id) != user_id and not cat.is_default):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
        if cat.is_default and str(cat.user_id) != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot edit default categories")
        updated = self.repo.update(id, **kwargs)
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
        return updated

    def delete(self, id: str, user_id: str) -> None:
        cat = self.repo.get(id)
        if not cat or str(cat.user_id) != user_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
        if cat.is_default:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot delete default categories")
        self.repo.delete(id)
