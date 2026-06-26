from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.services.insights_service import generate_insights

router = APIRouter(prefix="/insights", tags=["Insights"])


@router.get("/summary")
def insights_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    return generate_insights(str(current_user.id), db)
