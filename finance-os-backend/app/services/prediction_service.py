import uuid
from datetime import date, timedelta
from decimal import Decimal
from statistics import mean
from typing import Union
from sqlalchemy import extract, func
from sqlalchemy.orm import Session
from app.models.expense import Expense
from app.models.category import Category
from app.models.prediction import SpendingPrediction
from app.schemas.ai import CategoryPrediction


class PredictionService:
    def __init__(self, db: Session):
        self.db = db

    def generate_predictions(self, user_id: Union[str, uuid.UUID]) -> list[CategoryPrediction]:
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        today = date.today()
        if today.month == 1:
            six_months_ago = date(today.year - 1, 7, 1)
        else:
            start_month = today.month - 6
            year = today.year if start_month >= 1 else today.year - 1
            month = start_month if start_month >= 1 else start_month + 12
            six_months_ago = date(year, month, 1)

        category_totals: dict[str, dict] = {}
        current_month_start = today.replace(day=1)
        three_months_ago = current_month_start - timedelta(days=90)

        rows = (
            self.db.query(
                Expense.category_id,
                Category.name.label("cat_name"),
                Expense.amount,
                Expense.expense_date,
            )
            .outerjoin(Category, Category.id == Expense.category_id)
            .filter(
                Expense.user_id == user_id,
                Expense.expense_date >= six_months_ago,
                Expense.expense_date < current_month_start,
            )
            .all()
        )

        for row in rows:
            cat_name = row.cat_name or "Other"
            if cat_name not in category_totals:
                category_totals[cat_name] = {
                    "amounts": [],
                    "recent_amounts": [],
                    "category_id": str(row.category_id) if row.category_id else None,
                }
            category_totals[cat_name]["amounts"].append(float(row.amount))
            if row.expense_date >= three_months_ago:
                category_totals[cat_name]["recent_amounts"].append(float(row.amount))

        predictions = []
        for cat_name, data in category_totals.items():
            if not data["amounts"]:
                continue
            avg_6m = mean(data["amounts"])
            avg_3m = mean(data["recent_amounts"]) if data["recent_amounts"] else avg_6m
            growth_rate = ((avg_3m - avg_6m) / avg_6m) if avg_6m > 0 else 0
            predicted = avg_3m * (1 + growth_rate)
            variance = abs(sum((x - avg_3m) ** 2 for x in data["recent_amounts"]) / len(data["recent_amounts"])) if len(data["recent_amounts"]) > 1 else avg_3m * 0.1
            confidence = max(0, min(99, 100 - (variance / avg_3m * 100) if avg_3m > 0 else 50))

            predictions.append(CategoryPrediction(
                category_id=data["category_id"],
                category_name=cat_name,
                current_average=round(Decimal(str(avg_6m)), 2),
                predicted_amount=round(Decimal(str(predicted)), 2),
                confidence_score=round(Decimal(str(confidence)), 2),
                growth_rate=round(Decimal(str(growth_rate)), 4),
            ))

            existing = self.db.query(SpendingPrediction).filter(
                SpendingPrediction.user_id == user_id,
                SpendingPrediction.category_name == cat_name,
                SpendingPrediction.month == today.month,
                SpendingPrediction.year == today.year,
            ).first()
            if existing:
                existing.current_average = round(Decimal(str(avg_6m)), 2)
                existing.predicted_amount = round(Decimal(str(predicted)), 2)
                existing.confidence_score = round(Decimal(str(confidence)), 2)
                existing.growth_rate = round(Decimal(str(growth_rate)), 4)
            else:
                self.db.add(SpendingPrediction(
                    user_id=user_id,
                    category_id=uuid.UUID(data["category_id"]) if data["category_id"] else None,
                    category_name=cat_name,
                    current_average=round(Decimal(str(avg_6m)), 2),
                    predicted_amount=round(Decimal(str(predicted)), 2),
                    confidence_score=round(Decimal(str(confidence)), 2),
                    growth_rate=round(Decimal(str(growth_rate)), 4),
                    month=today.month,
                    year=today.year,
                ))

        self.db.commit()
        predictions.sort(key=lambda p: p.predicted_amount, reverse=True)
        return predictions
