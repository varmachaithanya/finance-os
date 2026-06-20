from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from app.repositories.expense_repository import ExpenseRepository
from app.repositories.income_repository import IncomeRepository
from app.repositories.credit_card_repository import CreditCardRepository
from app.repositories.debt_repository import DebtRepository
from app.repositories.subscription_repository import SubscriptionRepository
from app.repositories.budget_repository import BudgetRepository


class DashboardService:
    def __init__(self, db: Session):
        self.db = db
        self.expense_repo = ExpenseRepository(db)
        self.income_repo = IncomeRepository(db)
        self.credit_card_repo = CreditCardRepository(db)
        self.debt_repo = DebtRepository(db)
        self.subscription_repo = SubscriptionRepository(db)
        self.budget_repo = BudgetRepository(db)

    def get_summary(self, user_id: str) -> dict:
        today = date.today()
        first_day = today.replace(day=1)
        if today.month == 12:
            next_month = today.replace(year=today.year + 1, month=1, day=1)
        else:
            next_month = today.replace(month=today.month + 1, day=1)
        last_day = next_month - timedelta(days=1)

        total_income = self.income_repo.get_total_for_period(user_id, first_day, last_day)
        total_expenses = self.expense_repo.get_total_for_period(user_id, first_day, last_day)
        savings = total_income - total_expenses

        debt_summary = self.debt_repo.get_summary(user_id)
        total_owed, total_paid, active_count = debt_summary
        print(f"[DashboardService] debt_summary: total_owed={total_owed}, total_paid={total_paid}, active_count={active_count}", flush=True)

        cards = self.credit_card_repo.get_active_by_user(user_id)
        util_pcts = []
        for c in cards:
            if c.credit_limit > 0:
                util_pcts.append(float(c.outstanding_balance) / float(c.credit_limit) * 100)
        avg_util = sum(util_pcts) / len(util_pcts) if util_pcts else 0

        due_cards = self.credit_card_repo.get_upcoming_due(user_id, 7)
        upcoming_dues = [
            {
                "type": "credit_card",
                "name": f"{c.bank_name} - {c.card_name}",
                "amount": c.minimum_due,
                "due_date": c.due_date,
            }
            for c in due_cards if c.due_date
        ]

        upcoming_subs = self.subscription_repo.get_upcoming_renewals(user_id, 30)
        upcoming_renewals = [
            {
                "service_name": s.service_name,
                "amount": s.amount,
                "renewal_date": s.renewal_date,
            }
            for s in upcoming_subs
        ]

        budget_alerts_raw = self.budget_repo.get_alerts(user_id, today.month, today.year, 0.8)
        budget_alerts = [
            {
                "category": r.category_name,
                "pct_used": round(float(r.pct_used) * 100, 2),
            }
            for r in budget_alerts_raw
        ]

        return {
            "total_income_month": total_income,
            "total_expenses_month": total_expenses,
            "total_debt": total_owed,
            "total_paid_debt": total_paid,
            "active_debts": active_count,
            "remaining_balance": total_income - total_expenses,
            "monthly_savings": savings,
            "credit_card_utilization_avg": round(avg_util, 2),
            "upcoming_dues": upcoming_dues,
            "upcoming_renewals": upcoming_renewals,
            "budget_alerts": budget_alerts,
        }

    def get_charts(self, user_id: str, months: int = 6) -> dict:
        today = date.today()
        expense_by_category = self.expense_repo.get_summary_by_category(
            user_id, today.month, today.year
        )
        expense_categories = [
            {
                "category": r.category_name if r.category_name else "Uncategorized",
                "amount": r.total,
                "count": r.count,
                "color": r.category_color,
            }
            for r in expense_by_category
        ]

        expense_monthly = self.expense_repo.get_monthly_totals(user_id, months)
        income_monthly = self.income_repo.get_monthly_totals(user_id, months)

        monthly_map: dict[str, dict] = {}
        for label, total in expense_monthly:
            if label not in monthly_map:
                monthly_map[label] = {"month": label, "expenses": 0, "income": 0}
            monthly_map[label]["expenses"] = total
        for label, total in income_monthly:
            if label not in monthly_map:
                monthly_map[label] = {"month": label, "expenses": 0, "income": 0}
            monthly_map[label]["income"] = total

        monthly_trend = sorted(monthly_map.values(), key=lambda x: x["month"])
        print(f"[DashboardService] monthly_trend: {monthly_trend}", flush=True)
        print(f"[DashboardService] expense_monthly raw: {expense_monthly}", flush=True)

        debts, _ = self.debt_repo.get_by_user(user_id, limit=1000)
        total_debt_history = []
        running_total = sum(
            float(d.total_amount - d.paid_amount) for d in debts if d.status == "active"
        )
        total_debt_history.append({"month": "Current", "total_debt": running_total})

        debt_reduction = [
            {
                "month": str(d.due_date or ""),
                "total_debt": float(d.total_amount - d.paid_amount),
            }
            for d in debts[:12]
        ]
        print(f"[DashboardService] debts raw: count={len(debts)}, first={debts[0].__dict__ if debts else None}", flush=True)
        print(f"[DashboardService] debt_reduction: {debt_reduction}", flush=True)

        return {
            "expense_by_category": expense_categories,
            "monthly_trend": monthly_trend,
            "income_vs_expense": monthly_trend,
            "debt_reduction": debt_reduction,
        }
