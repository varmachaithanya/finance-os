from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary")
def dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    service = DashboardService(db)
    return service.get_summary(str(current_user.id))


@router.get("/charts")
def dashboard_charts(
    months: int = Query(6, ge=1, le=24),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    service = DashboardService(db)
    return service.get_charts(str(current_user.id), months)
