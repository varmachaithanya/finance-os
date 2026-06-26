import logging
from collections import defaultdict
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any, Optional

from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from app.models.expense import Expense
from app.models.income import Income
from app.models.category import Category
from app.models.user import User

logger = logging.getLogger(__name__)


def generate_insights(user_id: str, db: Session) -> dict[str, Any]:
    today = date.today()
    month_start = today.replace(day=1)
    prev_month_end = month_start - timedelta(days=1)
    prev_month_start = prev_month_end.replace(day=1)

    # All-time aggregates (for stat cards)
    total_income_all = db.query(func.coalesce(func.sum(Income.amount), 0)).filter(
        Income.user_id == user_id,
    ).scalar()
    total_expenses_all = db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
        Expense.user_id == user_id,
    ).scalar()

    # Current month aggregates (for analysis)
    month_income = db.query(func.coalesce(func.sum(Income.amount), 0)).filter(
        Income.user_id == user_id,
        Income.income_date >= month_start,
        Income.income_date <= today,
    ).scalar()
    month_expenses = db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
        Expense.user_id == user_id,
        Expense.expense_date >= month_start,
        Expense.expense_date <= today,
    ).scalar()

    # Previous month aggregates
    prev_income = db.query(func.coalesce(func.sum(Income.amount), 0)).filter(
        Income.user_id == user_id,
        Income.income_date >= prev_month_start,
        Income.income_date <= prev_month_end,
    ).scalar()
    prev_expenses = db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
        Expense.user_id == user_id,
        Expense.expense_date >= prev_month_start,
        Expense.expense_date <= prev_month_end,
    ).scalar()

    cur_savings = float(month_income) - float(month_expenses)
    cur_savings_rate = (cur_savings / float(month_income) * 100) if float(month_income) > 0 else 0

    # Category breakdown (current month)
    cat_rows = db.query(
        Category.name,
        Category.color,
        func.coalesce(func.sum(Expense.amount), 0).label("amount"),
    ).join(Expense, Expense.category_id == Category.id).filter(
        Expense.user_id == user_id,
        Expense.expense_date >= month_start,
        Expense.expense_date <= today,
        Category.type == "expense",
    ).group_by(Category.name, Category.color).all()

    total_exp = float(month_expenses) if float(month_expenses) > 0 else 1
    categories = []
    for row in cat_rows:
        amt = float(row.amount)
        pct = round(amt / total_exp * 100, 1)

        # Previous month spend for this category
        prev_amt = db.query(func.coalesce(func.sum(Expense.amount), 0)).filter(
            Expense.user_id == user_id,
            Expense.category_id == Category.id,
            Expense.expense_date >= prev_month_start,
            Expense.expense_date <= prev_month_end,
        ).scalar()
        prev_val = float(prev_amt) if prev_amt else 0
        change_pct = round((amt - prev_val) / prev_val * 100, 1) if prev_val > 0 else 0

        trend = "up" if change_pct > 5 else ("down" if change_pct < -5 else "same")

        categories.append({
            "name": row.name,
            "color": row.color or "#AEB6BF",
            "amount": amt,
            "percentage": pct,
            "last_month": prev_val,
            "change_pct": change_pct,
            "trend": trend,
        })

    categories.sort(key=lambda c: c["amount"], reverse=True)

    # Daily spending last 30 days
    thirty_ago = today - timedelta(days=30)
    daily_rows = db.query(
        Expense.expense_date,
        func.coalesce(func.sum(Expense.amount), 0).label("amount"),
    ).filter(
        Expense.user_id == user_id,
        Expense.expense_date >= thirty_ago,
        Expense.expense_date <= today,
    ).group_by(Expense.expense_date).order_by(Expense.expense_date).all()

    daily_spending = [{"date": str(r.expense_date), "amount": float(r.amount)} for r in daily_rows]

    # Monthly trend last 6 months
    six_months_ago = month_start - timedelta(days=180)
    inc_year = extract("year", Income.income_date)
    inc_month = extract("month", Income.income_date)
    monthly_income_rows = db.query(
        inc_year.label("year"),
        inc_month.label("month"),
        func.coalesce(func.sum(Income.amount), 0).label("total"),
    ).filter(
        Income.user_id == user_id,
        Income.income_date >= six_months_ago,
        Income.income_date <= today,
    ).group_by(inc_year, inc_month).order_by(inc_year, inc_month).all()

    exp_year = extract("year", Expense.expense_date)
    exp_month = extract("month", Expense.expense_date)
    monthly_expense_rows = db.query(
        exp_year.label("year"),
        exp_month.label("month"),
        func.coalesce(func.sum(Expense.amount), 0).label("total"),
    ).filter(
        Expense.user_id == user_id,
        Expense.expense_date >= six_months_ago,
        Expense.expense_date <= today,
    ).group_by(exp_year, exp_month).order_by(exp_year, exp_month).all()

    income_map = {}
    for r in monthly_income_rows:
        key = f"{int(r.year)}-{int(r.month):02d}"
        income_map[key] = float(r.total)

    expense_map = {}
    for r in monthly_expense_rows:
        key = f"{int(r.year)}-{int(r.month):02d}"
        expense_map[key] = float(r.total)

    all_keys = sorted(set(list(income_map.keys()) + list(expense_map.keys())))
    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    monthly_trend = []
    for key in all_keys:
        parts = key.split("-")
        m_idx = int(parts[1]) - 1
        label = f"{month_names[m_idx]} {parts[0][-2:]}"
        inc = income_map.get(key, 0)
        exp = expense_map.get(key, 0)
        monthly_trend.append({
            "month": label,
            "expenses": exp,
            "income": inc,
            "savings": inc - exp,
        })

    # Top spending day of week
    dow_col = func.extract("dow", Expense.expense_date)
    dow_rows = db.query(
        dow_col.label("dow"),
        func.coalesce(func.sum(Expense.amount), 0).label("total"),
    ).filter(
        Expense.user_id == user_id,
        Expense.expense_date >= thirty_ago,
        Expense.expense_date <= today,
    ).group_by(dow_col).all()

    dow_names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    top_dow = "N/A"
    if dow_rows:
        sorted_dow = sorted(dow_rows, key=lambda r: float(r.total), reverse=True)
        top_dow = dow_names[int(sorted_dow[0].dow)]

    # Generate insights
    insights = []

    # 1. Savings rate analysis
    if cur_savings_rate >= 30:
        insights.append({
            "type": "positive",
            "icon": "💰",
            "title": "Excellent Savings Rate",
            "message": f"Your savings rate is {cur_savings_rate:.0f}%. You're saving well above the recommended 20%.",
            "action": None,
        })
    elif cur_savings_rate >= 20:
        insights.append({
            "type": "positive",
            "icon": "👍",
            "title": "Good Savings Rate",
            "message": f"Your savings rate is {cur_savings_rate:.0f}%. You're on track with the 20% savings goal.",
            "action": None,
        })
    elif cur_savings_rate > 0:
        insights.append({
            "type": "warning",
            "icon": "⚠️",
            "title": "Low Savings Rate",
            "message": f"Your savings rate is only {cur_savings_rate:.0f}%. Try to save at least 20% of your income.",
            "action": "Review Budget",
        })
    else:
        insights.append({
            "type": "danger",
            "icon": "🚨",
            "title": "Spending More Than Earning",
            "message": f"You've spent ₹{abs(cur_savings):,.0f} more than you earned this month. Review your expenses immediately.",
            "action": "Check Expenses",
        })

    # 2. Top category alert
    if categories:
        top_cat = categories[0]
        if top_cat["percentage"] > 50:
            insights.append({
                "type": "warning",
                "icon": "📊",
                "title": f"High Spending on {top_cat['name']}",
                "message": f"{top_cat['name']} makes up {top_cat['percentage']:.0f}% of your total expenses. Consider reducing spending in this category.",
                "action": "View Category",
            })

    # 3. Month over month comparison
    if float(prev_expenses) > 0:
        mom_change = (float(month_expenses) - float(prev_expenses)) / float(prev_expenses) * 100
        if mom_change > 20:
            insights.append({
                "type": "warning",
                "icon": "📈",
                "title": "Expenses Increased Significantly",
                "message": f"Your expenses are up {mom_change:.0f}% compared to last month. Review recent spending.",
                "action": "View Expenses",
            })
        elif mom_change < -10:
            insights.append({
                "type": "positive",
                "icon": "📉",
                "title": "Expenses Decreased",
                "message": f"Your expenses dropped {abs(mom_change):.0f}% compared to last month. Great job!",
                "action": None,
            })

    # 4. Category spikes
    for cat in categories[:5]:
        if cat["change_pct"] > 50:
            insights.append({
                "type": "warning",
                "icon": "🔥",
                "title": f"Spike in {cat['name']}",
                "message": f"Spending on {cat['name']} increased {cat['change_pct']:.0f}% vs last month. Check if this is expected.",
                "action": "Review",
            })

    # 5. Top spending day
    if top_dow != "N/A":
        insights.append({
            "type": "info",
            "icon": "📅",
            "title": f"{top_dow} is Your Highest Spend Day",
            "message": f"You tend to spend the most on {top_dow}s. Consider setting a weekly budget for this day.",
            "action": "Set Budget",
        })

    # 6. 50/30/20 rule tip
    needs_pct = 0
    wants_pct = 0
    for cat in categories:
        if cat["name"] in ("Food", "Utilities", "Medical", "Fuel"):
            needs_pct += cat["percentage"]
        else:
            wants_pct += cat["percentage"]
    insights.append({
        "type": "tip",
        "icon": "💡",
        "title": "50/30/20 Rule",
        "message": f"Needs: {needs_pct:.0f}% | Wants: {wants_pct:.0f}% | Savings: {cur_savings_rate:.0f}%. Aim for 50/30/20.",
        "action": "Learn More",
    })

    return {
        "total_income": float(total_income_all),
        "total_expenses": float(total_expenses_all),
        "savings": cur_savings,
        "savings_rate": round(cur_savings_rate, 1),
        "categories": categories,
        "daily_spending": daily_spending,
        "monthly_trend": monthly_trend,
        "top_spending_day": top_dow,
        "insights": insights,
    }
