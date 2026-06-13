from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.category import (
    CategoryCreate,
    CategoryListResponse,
    CategoryResponse,
    CategoryUpdate,
)
from app.services.category_service import CategoryService

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("", summary="List categories")
def list_categories(
    type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CategoryListResponse:
    service = CategoryService(db)
    categories = service.get_categories(str(current_user.id), type)
    items = [CategoryResponse.model_validate(c) for c in categories]
    return CategoryListResponse(data=items, total=len(items), page=1, limit=len(items), pages=1)


@router.post("", summary="Create category", status_code=201)
def create_category(
    body: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CategoryResponse:
    service = CategoryService(db)
    cat = service.create(
        user_id=str(current_user.id),
        name=body.name,
        type=body.type,
        icon=body.icon,
        color=body.color,
    )
    return CategoryResponse.model_validate(cat)


@router.put("/{id}", summary="Update category")
def update_category(
    id: str,
    body: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CategoryResponse:
    service = CategoryService(db)
    kwargs = body.model_dump(exclude_none=True)
    cat = service.update(id, str(current_user.id), **kwargs)
    return CategoryResponse.model_validate(cat)


@router.delete("/{id}", summary="Delete category")
def delete_category(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    service = CategoryService(db)
    service.delete(id, str(current_user.id))
    return {"message": "Category deleted successfully"}
