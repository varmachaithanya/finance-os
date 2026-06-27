import uuid
from datetime import date, timedelta
from decimal import Decimal
from typing import Union
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.expense import Expense
from app.models.income import Income
from app.models.debt import Debt
from app.models.subscription import Subscription
from app.models.budget import Budget
from app.models.category import Category
from app.models.credit_card import CreditCard


class FinancialContext:
    def __init__(self):
        self.monthly_income: float = 0
        self.monthly_expenses: float = 0
        self.savings_rate: float = 0
        self.savings_amount: float = 0
        self.debt_total: float = 0
        self.debt_paid: float = 0
        self.debt_remaining: float = 0
        self.debt_progress_pct: float = 0
        self.upcoming_bills: list[dict] = []
        self.top_categories: list[dict] = []
        self.recent_transactions: list[dict] = []
        self.active_subscriptions: list[dict] = []
        self.subscription_monthly_cost: float = 0
        self.budget_status: list[dict] = []
        self.financial_health_score: float = 0
        self.currency: str = "INR"
        self.monthly_averages: dict = {}
        self.credit_card_dues: list[dict] = []

    def to_dict(self) -> dict:
        return {
            "monthly_income": round(self.monthly_income, 2),
            "monthly_expenses": round(self.monthly_expenses, 2),
            "savings_rate": round(self.savings_rate, 1),
            "savings_amount": round(self.savings_amount, 2),
            "debt_total": round(self.debt_total, 2),
            "debt_paid": round(self.debt_paid, 2),
            "debt_remaining": round(self.debt_remaining, 2),
            "debt_progress_pct": round(self.debt_progress_pct, 1),
            "upcoming_bills": self.upcoming_bills,
            "top_categories": self.top_categories,
            "recent_transactions": self.recent_transactions,
            "active_subscriptions": self.active_subscriptions,
            "subscription_monthly_cost": round(self.subscription_monthly_cost, 2),
            "budget_status": self.budget_status,
            "financial_health_score": round(self.financial_health_score, 1),
            "currency": self.currency,
            "monthly_averages": self.monthly_averages,
            "credit_card_dues": self.credit_card_dues,
        }

    def to_prompt_block(self) -> str:
        lines = ["=== USER FINANCIAL SUMMARY ==="]
        lines.append(f"Income (this month): {self.currency} {self.monthly_income:,.2f}")
        lines.append(f"Expenses (this month): {self.currency} {self.monthly_expenses:,.2f}")
        lines.append(f"Savings Rate: {self.savings_rate:.1f}%")
        lines.append(f"Savings Amount: {self.currency} {self.savings_amount:,.2f}")

        if self.debt_total > 0:
            lines.append(f"Total Debt: {self.currency} {self.debt_total:,.2f}")
            lines.append(f"Debt Paid: {self.currency} {self.debt_paid:,.2f}")
            lines.append(f"Debt Remaining: {self.currency} {self.debt_remaining:,.2f}")
            lines.append(f"Debt Payoff Progress: {self.debt_progress_pct:.1f}%")

        if self.top_categories:
            lines.append("\nTop Spending Categories (this month):")
            for c in self.top_categories[:5]:
                lines.append(f"  - {c['name']}: {self.currency} {c['amount']:,.2f} ({c['pct']:.1f}%)")

        if self.active_subscriptions:
            lines.append(f"\nActive Subscriptions ({len(self.active_subscriptions)}):")
            for s in self.active_subscriptions[:5]:
                lines.append(f"  - {s['name']}: {self.currency} {s['cost']:,.2f}/{s['cycle']}")
            lines.append(f"Total Monthly Subscription Cost: {self.currency} {self.subscription_monthly_cost:,.2f}")

        if self.budget_status:
            lines.append("\nBudget Status:")
            for b in self.budget_status:
                status = "ON TRACK" if b['remaining'] >= 0 else "OVER BUDGET"
                lines.append(f"  - {b['category']}: spent {self.currency} {b['spent']:,.2f} / budget {self.currency} {b['budget']:,.2f} ({status})")

        if self.upcoming_bills:
            lines.append("\nUpcoming Bills:")
            for b in self.upcoming_bills:
                lines.append(f"  - {b['description']}: {self.currency} {b['amount']:,.2f} due {b['due_date']}")

        if self.credit_card_dues:
            lines.append("\nCredit Card Dues:")
            for c in self.credit_card_dues:
                lines.append(f"  - {c['card']}: {self.currency} {c['outstanding']:,.2f} (min due: {self.currency} {c['minimum_due']:,.2f}) due {c['due_date']}")

        if self.recent_transactions:
            lines.append("\nRecent Transactions:")
            for t in self.recent_transactions[:5]:
                lines.append(f"  - {t['date']}: {t['description']} ({t['category']}) - {self.currency} {t['amount']:,.2f}")

        if self.monthly_averages:
            lines.append("\nMonthly Averages (last 3 months):")
            for k, v in self.monthly_averages.items():
                lines.append(f"  - {k}: {self.currency} {v:,.2f}")

        lines.append(f"\nFinancial Health Score: {self.financial_health_score:.1f}/100")
        lines.append("=== END OF USER DATA ===")

        return "\n".join(lines)


class FinancialContextService:
    def __init__(self, db: Session):
        self.db = db

    def get_context(self, user_id: Union[str, uuid.UUID]) -> FinancialContext:
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)

        ctx = FinancialContext()
        today = date.today()
        current_month_start = today.replace(day=1)
        last_month_start = (current_month_start - timedelta(days=1)).replace(day=1)

        ctx.monthly_income = float(
            self.db.query(func.sum(Income.amount))
            .filter(Income.user_id == user_id, Income.income_date >= current_month_start)
            .scalar() or Decimal("0")
        )

        ctx.monthly_expenses = float(
            self.db.query(func.sum(Expense.amount))
            .filter(Expense.user_id == user_id, Expense.expense_date >= current_month_start)
            .scalar() or Decimal("0")
        )

        if ctx.monthly_income > 0:
            ctx.savings_amount = ctx.monthly_income - ctx.monthly_expenses
            ctx.savings_rate = (ctx.savings_amount / ctx.monthly_income) * 100

        debts = self.db.query(Debt).filter(Debt.user_id == user_id).all()
        if debts:
            ctx.debt_total = sum(float(d.total_amount or 0) for d in debts)
            ctx.debt_paid = sum(float(d.paid_amount or 0) for d in debts)
            ctx.debt_remaining = ctx.debt_total - ctx.debt_paid
            if ctx.debt_total > 0:
                ctx.debt_progress_pct = (ctx.debt_paid / ctx.debt_total) * 100

        category_spending = (
            self.db.query(
                Category.name,
                func.sum(Expense.amount).label("total"),
            )
            .join(Expense, Expense.category_id == Category.id)
            .filter(Expense.user_id == user_id, Expense.expense_date >= current_month_start)
            .group_by(Category.name)
            .order_by(func.sum(Expense.amount).desc())
            .all()
        )
        for c in category_spending:
            pct = (float(c.total) / ctx.monthly_expenses * 100) if ctx.monthly_expenses > 0 else 0
            ctx.top_categories.append({"name": c.name, "amount": float(c.total), "pct": pct})

        subs = self.db.query(Subscription).filter(
            Subscription.user_id == user_id, Subscription.is_active == True
        ).all()
        for s in subs:
            monthly = float(s.amount)
            if s.billing_cycle == "yearly":
                monthly = monthly / 12
            elif s.billing_cycle == "quarterly":
                monthly = monthly / 3
            ctx.subscription_monthly_cost += monthly
            ctx.active_subscriptions.append({
                "name": s.service_name,
                "cost": float(s.amount),
                "cycle": s.billing_cycle,
                "next_renewal": str(s.renewal_date) if s.renewal_date else "",
            })

        budgets = self.db.query(Budget).filter(
            Budget.user_id == user_id, Budget.period == "monthly"
        ).all()
        for b in budgets:
            spent = float(
                self.db.query(func.sum(Expense.amount))
                .filter(
                    Expense.user_id == user_id,
                    Expense.category_id == b.category_id,
                    Expense.expense_date >= current_month_start,
                )
                .scalar() or Decimal("0")
            )
            cat_name = (
                self.db.query(Category.name).filter(Category.id == b.category_id).scalar()
                or "Unknown"
            )
            ctx.budget_status.append({
                "category": cat_name,
                "budget": float(b.budget_amount),
                "spent": spent,
                "remaining": float(b.budget_amount) - spent,
            })

        upcoming_subs = self.db.query(Subscription).filter(
            Subscription.user_id == user_id,
            Subscription.is_active == True,
            Subscription.renewal_date >= today,
            Subscription.renewal_date <= today + timedelta(days=30),
        ).all()
        for s in upcoming_subs:
            ctx.upcoming_bills.append({
                "description": f"Subscription: {s.service_name}",
                "amount": float(s.amount),
                "due_date": str(s.renewal_date),
                "type": "subscription",
            })

        credit_cards = self.db.query(CreditCard).filter(
            CreditCard.user_id == user_id, CreditCard.is_active == True
        ).all()
        for cc in credit_cards:
            if cc.due_date:
                ctx.credit_card_dues.append({
                    "card": cc.card_name,
                    "outstanding": float(cc.outstanding_balance or 0),
                    "minimum_due": float(cc.minimum_due or 0),
                    "due_date": str(cc.due_date),
                    "bank": cc.bank_name,
                })

        recent = (
            self.db.query(Expense)
            .filter(Expense.user_id == user_id)
            .order_by(Expense.expense_date.desc())
            .limit(5)
            .all()
        )
        for e in recent:
            cat_name = (
                self.db.query(Category.name).filter(Category.id == e.category_id).scalar()
                or "Other"
            )
            ctx.recent_transactions.append({
                "date": str(e.expense_date),
                "description": e.description or "Untitled",
                "amount": float(e.amount),
                "category": cat_name,
            })

        incomes = (
            self.db.query(
                func.sum(Income.amount), func.date_trunc("month", Income.income_date)
            )
            .filter(
                Income.user_id == user_id,
                Income.income_date >= current_month_start - timedelta(days=90),
            )
            .group_by(func.date_trunc("month", Income.income_date))
            .all()
        )
        if incomes:
            avg_income = sum(float(i[0]) for i in incomes) / len(incomes)
            ctx.monthly_averages["income"] = avg_income

        expenses_by_month = (
            self.db.query(
                func.sum(Expense.amount), func.date_trunc("month", Expense.expense_date)
            )
            .filter(
                Expense.user_id == user_id,
                Expense.expense_date >= current_month_start - timedelta(days=90),
            )
            .group_by(func.date_trunc("month", Expense.expense_date))
            .all()
        )
        if expenses_by_month:
            avg_expense = sum(float(e[0]) for e in expenses_by_month) / len(expenses_by_month)
            ctx.monthly_averages["expenses"] = avg_expense

        score = 50
        if ctx.savings_rate >= 30:
            score += 25
        elif ctx.savings_rate >= 20:
            score += 15
        elif ctx.savings_rate >= 10:
            score += 5

        if ctx.debt_total == 0:
            score += 15
        elif ctx.debt_progress_pct >= 50:
            score += 10
        elif ctx.debt_progress_pct >= 25:
            score += 5

        if ctx.budget_status:
            on_track = sum(1 for b in ctx.budget_status if b["remaining"] >= 0)
            score += int((on_track / len(ctx.budget_status)) * 10)

        ctx.financial_health_score = min(score, 100)

        return ctx
