import os
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.services.report_service import ReportService

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/generate")
def generate_report(
    period: str = Query("monthly", pattern="^(daily|weekly|monthly|yearly)$"),
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None, ge=1, le=12),
    week: Optional[int] = Query(None, ge=1, le=53),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    service = ReportService(db)
    return service.generate(str(current_user.id), period, year, month, week)


@router.get("/export")
def export_report(
    format: str = Query("pdf", pattern="^(pdf|csv|xlsx)$"),
    period: str = Query("monthly", pattern="^(daily|weekly|monthly|yearly)$"),
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None, ge=1, le=12),
    week: Optional[int] = Query(None, ge=1, le=53),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FileResponse:
    service = ReportService(db)
    if format == "pdf":
        filepath = service.export_pdf(str(current_user.id), period, year, month, week)
        media_type = "application/pdf"
    elif format == "xlsx":
        filepath = service.export_excel(str(current_user.id), period, year, month, week)
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    else:
        filepath = service.export_csv(str(current_user.id), period, year, month, week)
        media_type = "text/csv"
    return FileResponse(
        filepath,
        media_type=media_type,
        filename=os.path.basename(filepath),
        headers={"Content-Disposition": f"attachment; filename={os.path.basename(filepath)}"},
    )
