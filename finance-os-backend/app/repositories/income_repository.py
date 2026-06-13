from datetime import date, timedelta
from decimal import Decimal
from typing import Optional

from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from app.models.income import Income
from app.repositories.base import BaseRepository, to_uuid


class IncomeRepository(BaseRepository[Income]):
    def __init__(self, db: Session):
        super().__init__(Income, db)

    def get_by_user(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 20,
        sort: str = "income_date",
        order: str = "desc",
        search: Optional[str] = None,
        source: Optional[str] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
    ) -> tuple[list[Income], int]:
        query = self.db.query(Income).filter(Income.user_id == to_uuid(user_id))
        if source:
            query = query.filter(Income.source == source)
        if from_date:
            query = query.filter(Income.income_date >= from_date)
        if to_date:
            query = query.filter(Income.income_date <= to_date)
        if search:
            query = query.filter(Income.description.ilike(f"%{search}%"))
        total = query.count()
        sort_col = getattr(Income, sort, Income.income_date)
        query = query.order_by(sort_col.desc() if order == "desc" else sort_col.asc())
        items = query.offset(skip).limit(limit).all()
        return items, total

    def get_summary_by_source(self, user_id: str, month: int, year: int) -> list[tuple]:
        return (
            self.db.query(
                Income.source,
                func.sum(Income.amount).label("total"),
                func.count(Income.id).label("count"),
            )
            .filter(
                Income.user_id == to_uuid(user_id),
                extract("month", Income.income_date) == month,
                extract("year", Income.income_date) == year,
            )
            .group_by(Income.source)
            .all()
        )

    def get_total_for_period(self, user_id: str, from_date: date, to_date: date) -> Decimal:
        result = (
            self.db.query(func.coalesce(func.sum(Income.amount), 0))
            .filter(
                Income.user_id == to_uuid(user_id),
                Income.income_date >= from_date,
                Income.income_date <= to_date,
            )
            .scalar()
        )
        return result

    def get_monthly_totals(self, user_id: str, months: int) -> list[tuple]:
        start_date = date.today().replace(day=1) - timedelta(days=months * 31)
        start_date = start_date.replace(day=1)
        results = (
            self.db.query(
                extract("year", Income.income_date).label("year"),
                extract("month", Income.income_date).label("month"),
                func.sum(Income.amount).label("total"),
            )
            .filter(
                Income.user_id == to_uuid(user_id),
                Income.income_date >= start_date,
            )
            .group_by("year", "month")
            .order_by("year", "month")
            .all()
        )
        return [
            (f"{int(r.year)}-{int(r.month):02d}", r.total)
            for r in results
        ]
