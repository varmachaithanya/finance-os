import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class CategoryCreate(BaseModel):
    name: str
    type: str
    icon: Optional[str] = None
    color: Optional[str] = None


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None


class CategoryResponse(BaseModel):
    id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    name: str
    type: str
    icon: Optional[str] = None
    color: Optional[str] = None
    is_default: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


class CategoryListResponse(BaseModel):
    data: list[CategoryResponse]
    total: int
    page: int
    limit: int
    pages: int
