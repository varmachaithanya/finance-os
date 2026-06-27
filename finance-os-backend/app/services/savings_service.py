import uuid
from datetime import date, timedelta
from decimal import Decimal
from typing import Union
from sqlalchemy import extract, func
from sqlalchemy.orm import Session
from app.models.expense import Expense
from app.models.category import Category
from app.models.subscription import Subscription
from app.schemas.ai import SavingSuggestion


class SavingsRecommendationEngine:
    def __init__(self, db: Session):
        self.db = db

    def generate(self, user_id: Union[str, uuid.UUID]) -> list[SavingSuggestion]:
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        suggestions: list[SavingSuggestion] = []
        today = date.today()
        month_start = today.replace(day=1)
        three_months_ago = month_start - timedelta(days=90)

        total_expenses = (
            self.db.query(func.coalesce(func.sum(Expense.amount), 0))
            .filter(
                Expense.user_id == user_id,
                Expense.expense_date >= three_months_ago,
                Expense.expense_date < month_start,
            )
            .scalar()
        )
        total_expenses = float(total_expenses) if total_expenses else 0

        if total_expenses == 0:
            return suggestions

        category_spending = (
            self.db.query(
                Category.name.label("cat_name"),
                func.sum(Expense.amount).label("total"),
                func.count(Expense.id).label("count"),
            )
            .outerjoin(Category, Category.id == Expense.category_id)
            .filter(
                Expense.user_id == user_id,
                Expense.expense_date >= three_months_ago,
                Expense.expense_date < month_start,
            )
            .group_by(Category.name)
            .all()
        )

        spending_map = {}
        for row in category_spending:
            name = row.cat_name or "Other"
            spending_map[name] = {
                "total": float(row.total),
                "count": row.count,
            }

        food_total = spending_map.get("Food", {}).get("total", 0)
        food_pct = (food_total / total_expenses * 100) if total_expenses > 0 else 0
        if food_pct > 30:
            reduction = food_total * 0.2
            monthly = round(reduction / 3, 2)
            yearly = round(monthly * 12, 2)
            suggestions.append(SavingSuggestion(
                type="food_reduction",
                title="Reduce Food Spending",
                description=f"Food is {food_pct:.0f}% of your spending. Reducing by 20% saves ₹{monthly:,.0f}/month and ₹{yearly:,.0f}/year.",
                priority="high" if food_pct > 40 else "medium",
                monthly_savings=Decimal(str(monthly)),
                yearly_savings=Decimal(str(yearly)),
                category="Food",
            ))

        shopping_total = spending_map.get("Shopping", {}).get("total", 0)
        shopping_pct = (shopping_total / total_expenses * 100) if total_expenses > 0 else 0
        if shopping_pct > 20:
            reduction = shopping_total * 0.15
            monthly = round(reduction / 3, 2)
            yearly = round(monthly * 12, 2)
            suggestions.append(SavingSuggestion(
                type="shopping_reduction",
                title="Reduce Shopping Spending",
                description=f"Shopping is {shopping_pct:.0f}% of your spending. Reducing by 15% saves ₹{monthly:,.0f}/month and ₹{yearly:,.0f}/year.",
                priority="medium",
                monthly_savings=Decimal(str(monthly)),
                yearly_savings=Decimal(str(yearly)),
                category="Shopping",
            ))

        food_delivery_amount = (
            self.db.query(func.coalesce(func.sum(Expense.amount), 0))
            .filter(
                Expense.user_id == user_id,
                Expense.description.ilike("%swiggy%") | Expense.description.ilike("%zomato%") | Expense.description.ilike("%blinkit%") | Expense.description.ilike("%zepto%") | Expense.description.ilike("%dunzo%") | Expense.description.ilike("%eat%"),
                Expense.expense_date >= three_months_ago,
                Expense.expense_date < month_start,
            )
            .scalar()
        )
        food_delivery_amount = float(food_delivery_amount) if food_delivery_amount else 0
        if food_delivery_amount > 1000:
            monthly_delivery = round(food_delivery_amount / 3, 2)
            reduction = monthly_delivery * 0.2
            yearly = round(reduction * 12, 2)
            suggestions.append(SavingSuggestion(
                type="food_delivery",
                title="Cut Down Food Delivery",
                description=f"You spent ₹{monthly_delivery:,.0f}/month on food delivery. Reducing by 20% saves ₹{reduction:,.0f}/month and ₹{yearly:,.0f}/year.",
                priority="medium",
                monthly_savings=Decimal(str(reduction)),
                yearly_savings=Decimal(str(yearly)),
                category="Food",
            ))

        sub_count = (
            self.db.query(func.count(Subscription.id))
            .filter(Subscription.user_id == user_id, Subscription.is_active == True)
            .scalar()
        )
        if sub_count and sub_count > 5:
            cancel_count = min(sub_count - 5, 2)
            avg_sub_cost = (
                self.db.query(func.coalesce(func.avg(Subscription.amount), 0))
                .filter(Subscription.user_id == user_id, Subscription.is_active == True)
                .scalar()
            )
            avg_sub_cost = float(avg_sub_cost) if avg_sub_cost else 0
            savings = round(avg_sub_cost * cancel_count, 2)
            yearly = round(savings * 12, 2)
            suggestions.append(SavingSuggestion(
                type="subscriptions",
                title="Clean Up Subscriptions",
                description=f"You have {sub_count} active subscriptions. Cancelling {cancel_count} could save ₹{savings:,.0f}/month and ₹{yearly:,.0f}/year.",
                priority="high" if sub_count > 8 else "medium",
                monthly_savings=Decimal(str(savings)),
                yearly_savings=Decimal(str(yearly)),
                category="Subscriptions",
            ))

        avg_monthly = total_expenses / 3 if total_expenses > 0 else 0
        if avg_monthly > 0:
            potential_savings = avg_monthly * 0.1
            yearly = round(potential_savings * 12, 2)
            suggestions.append(SavingSuggestion(
                type="general",
                title="General Spending Awareness",
                description=f"Your monthly average is ₹{avg_monthly:,.0f}. Saving just 10% gives you ₹{potential_savings:,.0f}/month and ₹{yearly:,.0f}/year.",
                priority="low",
                monthly_savings=Decimal(str(round(potential_savings, 2))),
                yearly_savings=Decimal(str(yearly)),
                category=None,
            ))

        suggestions.sort(key=lambda s: {"high": 0, "medium": 1, "low": 2}[s.priority])
        return suggestions
