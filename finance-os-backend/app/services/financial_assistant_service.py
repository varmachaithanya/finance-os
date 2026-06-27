import uuid
import structlog
from datetime import date, timedelta
from decimal import Decimal
from typing import Union
from sqlalchemy import extract, func
from sqlalchemy.orm import Session
from app.models.expense import Expense
from app.models.income import Income
from app.models.debt import Debt
from app.models.subscription import Subscription
from app.models.budget import Budget
from app.models.category import Category
from app.models.chat_history import ChatHistory
from app.services.financial_context_service import FinancialContextService

logger = structlog.get_logger()


class AIProvider:
    def ask(self, message: str, user_id: Union[str, uuid.UUID], db: Session) -> dict:
        raise NotImplementedError


class RuleBasedProvider(AIProvider):
    def __init__(self):
        self.intents = {
            "expenses_monthly": ["total spend", "monthly spending", "how much did i spend", "total expense", "spent this month", "spent last month"],
            "expenses_category": ["spend on", "spending on", "much on", "expenses for", "category"],
            "expenses_largest": ["largest expense", "biggest expense", "highest expense", "most expensive"],
            "expenses_trends": ["spending trend", "expense trend", "how has my spending", "spending pattern"],
            "income_monthly": ["monthly income", "total income", "how much do i earn", "income this month"],
            "income_growth": ["income growth", "income trend", "salary trend", "earning more"],
            "savings_rate": ["savings rate", "saving rate", "how much do i save", "savings percentage"],
            "savings_remaining": ["remaining balance", "left after expense", "disposable income", "unused income"],
            "debt_total": ["total debt", "how much debt", "debt total", "overall debt", "all debt"],
            "debt_progress": ["debt payoff", "debt progress", "pay off debt", "debt repayment", "debt journey"],
            "budget_remaining": ["budget remaining", "budget left", "remaining budget"],
            "budget_overspending": ["overspend", "over budget", "over budget", "exceeded budget"],
            "subscriptions_renewals": ["upcoming renewal", "subscription renewal", "renewing", "auto renew"],
            "subscriptions_total": ["subscription cost", "subscription total", "monthly subscription", "total subscriptions"],
            "recommendations": ["recommend", "suggest", "advice", "tip", "improve", "optimize", "financial health"],
            "food_spending": ["food spend", "food expense", "spent on food", "food cost", "eating out", "grocery"],
        }

    def detect_intent(self, message: str) -> str:
        msg_lower = message.lower().strip()
        for intent, keywords in self.intents.items():
            for kw in keywords:
                if kw in msg_lower:
                    return intent
        if any(w in msg_lower for w in ["how much", "what is", "tell me", "show", "my"]):
            if any(w in msg_lower for w in ["expense", "spend", "spent", "cost"]):
                return "expenses_monthly"
            if any(w in msg_lower for w in ["income", "earn", "salary"]):
                return "income_monthly"
            if any(w in msg_lower for w in ["debt", "loan", "owe", "borrow"]):
                return "debt_total"
            if any(w in msg_lower for w in ["saving", "save", "savings"]):
                return "savings_rate"
            if any(w in msg_lower for w in ["budget"]):
                return "budget_remaining"
            if any(w in msg_lower for w in ["subscription", "subscri"]):
                return "subscriptions_total"
        return "recommendations"

    def ask(self, message: str, user_id: Union[str, uuid.UUID], db: Session) -> dict:
        intent = self.detect_intent(message)
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        today = date.today()
        current_month_start = today.replace(day=1)
        last_month_end = current_month_start - timedelta(days=1)
        last_month_start = last_month_end.replace(day=1)

        answer = ""
        recommendations = []

        if intent == "expenses_monthly":
            total = db.query(func.sum(Expense.amount)).filter(
                Expense.user_id == user_id,
                Expense.expense_date >= current_month_start,
                Expense.expense_date <= today,
            ).scalar() or Decimal("0")
            total_last = db.query(func.sum(Expense.amount)).filter(
                Expense.user_id == user_id,
                Expense.expense_date >= last_month_start,
                Expense.expense_date <= last_month_end,
            ).scalar() or Decimal("0")
            answer = f"You spent ₹{float(total):,.0f} this month."
            if total_last > 0:
                diff = ((float(total) - float(total_last)) / float(total_last)) * 100
                if diff > 0:
                    answer += f" That's {diff:.0f}% more than last month (₹{float(total_last):,.0f})."
                else:
                    answer += f" That's {abs(diff):.0f}% less than last month (₹{float(total_last):,.0f})."
            category_breakdown = db.query(
                Category.name, func.sum(Expense.amount).label("total")
            ).join(Expense, Expense.category_id == Category.id).filter(
                Expense.user_id == user_id,
                Expense.expense_date >= current_month_start,
            ).group_by(Category.name).order_by(func.sum(Expense.amount).desc()).limit(3).all()
            if category_breakdown:
                top = category_breakdown[0]
                answer += f" Your top category is {top.name} at ₹{float(top.total):,.0f}."
            if float(total) > 0:
                recommendations.append(f"Your monthly spending is ₹{float(total):,.0f}. Consider reviewing your top categories for potential savings.")

        elif intent == "expenses_category":
            category_keywords = {
                "food": ["food", "eating", "grocery", "restaurant", "dining", "zomato", "swiggy"],
                "transport": ["transport", "fuel", "petrol", "diesel", "uber", "ola", "travel", "commute"],
                "shopping": ["shopping", "clothes", "apparel", "online shopping", "amazon", "flipkart"],
                "entertainment": ["entertainment", "movie", "netflix", "prime", "ott", "game", "music"],
                "bills": ["bill", "utility", "electricity", "water", "internet", "phone", "mobile"],
                "rent": ["rent", "housing", "maintenance"],
                "health": ["health", "medical", "doctor", "medicine", "hospital", "fitness", "gym"],
                "education": ["education", "course", "book", "training", "school", "college", "tuition"],
                "subscription": ["subscription", "subscriptions"],
            }
            matched_category = None
            msg_lower = message.lower()
            for cat, keywords in category_keywords.items():
                for kw in keywords:
                    if kw in msg_lower:
                        matched_category = cat
                        break
                if matched_category:
                    break

            if matched_category:
                like_pattern = f"%{matched_category}%"
                total_cat = db.query(func.sum(Expense.amount)).join(
                    Category, Expense.category_id == Category.id
                ).filter(
                    Expense.user_id == user_id,
                    Expense.expense_date >= current_month_start,
                    func.lower(Category.name).like(like_pattern),
                ).scalar() or Decimal("0")

                total_cat_last = db.query(func.sum(Expense.amount)).join(
                    Category, Expense.category_id == Category.id
                ).filter(
                    Expense.user_id == user_id,
                    Expense.expense_date >= last_month_start,
                    Expense.expense_date <= last_month_end,
                    func.lower(Category.name).like(like_pattern),
                ).scalar() or Decimal("0")

                cat_label = matched_category.capitalize()
                answer = f"You spent ₹{float(total_cat):,.0f} on {cat_label} this month."
                if total_cat_last > 0:
                    diff = ((float(total_cat) - float(total_cat_last)) / float(total_cat_last)) * 100
                    if abs(diff) > 0:
                        direction = "more" if diff > 0 else "less"
                        answer += f" That's {abs(diff):.0f}% {direction} than last month (₹{float(total_cat_last):,.0f})."
                if float(total_cat) > 0:
                    recommendations.append(f"You spend ₹{float(total_cat):,.0f} on {cat_label}. Setting a budget for this category could help track spending.")
            else:
                total_by_cat = db.query(
                    Category.name, func.sum(Expense.amount).label("total")
                ).join(Expense, Expense.category_id == Category.id).filter(
                    Expense.user_id == user_id,
                    Expense.expense_date >= current_month_start,
                ).group_by(Category.name).order_by(func.sum(Expense.amount).desc()).all()

                if total_by_cat:
                    lines = [f"{c.name}: ₹{float(c.total):,.0f}" for c in total_by_cat]
                    answer = "Here's your spending by category this month:\n" + "\n".join(lines)
                else:
                    answer = "No expenses recorded this month."

        elif intent == "expenses_largest":
            largest = db.query(Expense).join(
                Category, Expense.category_id == Category.id
            ).filter(
                Expense.user_id == user_id,
                Expense.expense_date >= current_month_start,
            ).order_by(Expense.amount.desc()).first()
            if largest:
                cat_name = db.query(Category.name).filter(Category.id == largest.category_id).scalar() or "Unknown"
                answer = f"Your largest expense this month was ₹{float(largest.amount):,.0f} for {largest.description or 'something'} in {cat_name}."
            else:
                answer = "No expenses recorded this month."

        elif intent == "expenses_trends":
            six_months_ago = current_month_start - timedelta(days=180)
            monthly = db.query(
                extract("year", Expense.expense_date).label("year"),
                extract("month", Expense.expense_date).label("month"),
                func.sum(Expense.amount).label("total"),
            ).filter(
                Expense.user_id == user_id,
                Expense.expense_date >= six_months_ago,
            ).group_by("year", "month").order_by("year", "month").all()
            if monthly and len(monthly) >= 2:
                amounts = [float(m.total) for m in monthly]
                avg = sum(amounts) / len(amounts)
                recent = amounts[-1]
                trend = "increasing" if recent > avg else "decreasing" if recent < avg else "stable"
                answer = f"Over the last {len(monthly)} months, your average monthly spending is ₹{avg:,.0f}. Your spending trend is {trend}."
                if trend == "increasing":
                    recommendations.append("Your spending is trending upward. Consider reviewing your expenses to identify areas to cut back.")
                else:
                    recommendations.append("Your spending is trending downward. Great job managing your expenses!")
            elif monthly:
                answer = f"Last month you spent ₹{float(monthly[-1].total):,.0f}."
            else:
                answer = "Not enough data to determine spending trends."

        elif intent == "income_monthly":
            total_income = db.query(func.sum(Income.amount)).filter(
                Income.user_id == user_id,
                Income.income_date >= current_month_start,
            ).scalar() or Decimal("0")
            total_income_last = db.query(func.sum(Income.amount)).filter(
                Income.user_id == user_id,
                Income.income_date >= last_month_start,
                Income.income_date <= last_month_end,
            ).scalar() or Decimal("0")
            answer = f"Your total income this month is ₹{float(total_income):,.0f}."
            if total_income_last > 0:
                diff = ((float(total_income) - float(total_income_last)) / float(total_income_last)) * 100
                if abs(diff) > 1:
                    direction = "up" if diff > 0 else "down"
                    answer += f" That's {direction} {abs(diff):.0f}% from last month (₹{float(total_income_last):,.0f})."

        elif intent == "income_growth":
            six_months_ago = current_month_start - timedelta(days=180)
            monthly = db.query(
                extract("year", Income.income_date).label("year"),
                extract("month", Income.income_date).label("month"),
                func.sum(Income.amount).label("total"),
            ).filter(
                Income.user_id == user_id,
                Income.income_date >= six_months_ago,
            ).group_by("year", "month").order_by("year", "month").all()
            if monthly and len(monthly) >= 2:
                first = float(monthly[0].total)
                last = float(monthly[-1].total)
                growth = ((last - first) / first) * 100 if first > 0 else 0
                direction = "grown" if growth > 0 else "declined" if growth < 0 else "remained stable"
                answer = f"Over the last {len(monthly)} months, your income has {direction} by {abs(growth):.0f}%."
                if growth > 0:
                    recommendations.append(f"Your income has grown by {growth:.0f}%. Consider increasing your savings rate.")
            elif monthly:
                answer = f"Your last recorded income was ₹{float(monthly[-1].total):,.0f}."
            else:
                answer = "Not enough income data to determine trends."

        elif intent == "savings_rate":
            total_income = db.query(func.sum(Income.amount)).filter(
                Income.user_id == user_id,
                Income.income_date >= current_month_start,
            ).scalar() or Decimal("0")
            total_expenses = db.query(func.sum(Expense.amount)).filter(
                Expense.user_id == user_id,
                Expense.expense_date >= current_month_start,
            ).scalar() or Decimal("0")
            if float(total_income) > 0:
                savings = float(total_income) - float(total_expenses)
                rate = (savings / float(total_income)) * 100
                if rate < 0:
                    answer = f"Your expenses (₹{float(total_expenses):,.0f}) exceed your income (₹{float(total_income):,.0f}) this month. You're overspending by ₹{abs(savings):,.0f}."
                    recommendations.append("Your expenses exceed your income. Consider cutting non-essential spending to achieve a positive savings rate.")
                elif rate >= 30:
                    answer = f"Your savings rate this month is {rate:.0f}% (₹{savings:,.0f}). Excellent! You're saving very well."
                    recommendations.append(f"Your savings rate of {rate:.0f}% is excellent. Consider investing your savings for long-term growth.")
                elif rate >= 20:
                    answer = f"Your savings rate this month is {rate:.0f}% (₹{savings:,.0f}). Great job! You're on track."
                    recommendations.append(f"Your savings rate of {rate:.0f}% is healthy. Aim for 30% to accelerate your financial goals.")
                elif rate >= 10:
                    answer = f"Your savings rate this month is {rate:.0f}% (₹{savings:,.0f}). That's decent. Try to increase it further."
                    recommendations.append(f"Your savings rate is {rate:.0f}%. Try to save at least 20% of your income each month.")
                else:
                    answer = f"Your savings rate this month is {rate:.0f}% (₹{savings:,.0f}). There's room for improvement."
                    recommendations.append(f"Your savings rate is only {rate:.0f}%. Consider reducing discretionary spending to save more.")
            else:
                answer = "No income recorded this month. Add your income to see savings insights."

        elif intent == "savings_remaining":
            total_income = db.query(func.sum(Income.amount)).filter(
                Income.user_id == user_id,
                Income.income_date >= current_month_start,
            ).scalar() or Decimal("0")
            total_expenses = db.query(func.sum(Expense.amount)).filter(
                Expense.user_id == user_id,
                Expense.expense_date >= current_month_start,
            ).scalar() or Decimal("0")
            remaining = float(total_income) - float(total_expenses)
            if remaining > 0:
                answer = f"After expenses this month, you have ₹{remaining:,.0f} remaining from your income of ₹{float(total_income):,.0f}."
            elif remaining == 0:
                answer = "Your income and expenses are equal this month. You have nothing remaining."
            else:
                answer = f"You've spent ₹{abs(remaining):,.0f} more than your income this month. Consider reducing expenses."

        elif intent == "debt_total":
            debts = db.query(Debt).filter(
                Debt.user_id == user_id,
                Debt.status == "active",
            ).all()
            if debts:
                total = sum(float(d.total_amount or 0) for d in debts)
                paid = sum(float(d.paid_amount or 0) for d in debts)
                remaining = total - paid
                answer = f"You have {len(debts)} active debt(s) totaling ₹{total:,.0f}. You've paid ₹{paid:,.0f} so far, with ₹{remaining:,.0f} remaining."
                recommendations.append(f"You have ₹{remaining:,.0f} in outstanding debt. Consider using the debt payoff optimizer to create a repayment plan.")
            else:
                answer = "You have no active debts. Great job staying debt-free!"

        elif intent == "debt_progress":
            debts = db.query(Debt).filter(
                Debt.user_id == user_id,
            ).all()
            if debts:
                total = sum(float(d.total_amount or 0) for d in debts)
                paid = sum(float(d.paid_amount or 0) for d in debts)
                pct = (paid / total) * 100 if total > 0 else 0
                answer = f"You are {pct:.0f}% through your debt payoff journey. You've paid ₹{paid:,.0f} of ₹{total:,.0f} total debt."
                if pct >= 75:
                    recommendations.append(f"You're {pct:.0f}% done with debt repayment! Almost there — keep pushing!")
                elif pct >= 50:
                    recommendations.append(f"You've paid off {pct:.0f}% of your debt. You're more than halfway there!")
                else:
                    recommendations.append(f"You've paid {pct:.0f}% of your debt. Consider increasing your monthly payments to accelerate progress.")
            else:
                answer = "You have no debts to track."

        elif intent == "budget_remaining":
            budgets = db.query(Budget).filter(
                Budget.user_id == user_id,
                Budget.period == "monthly",
            ).all()
            if budgets:
                lines = []
                for b in budgets:
                    spent = db.query(func.sum(Expense.amount)).filter(
                        Expense.user_id == user_id,
                        Expense.category_id == b.category_id,
                        Expense.expense_date >= current_month_start,
                    ).scalar() or Decimal("0")
                    remaining_b = float(b.budget_amount) - float(spent)
                    cat_name = db.query(Category.name).filter(Category.id == b.category_id).scalar() or "Unknown"
                    if remaining_b >= 0:
                        lines.append(f"{cat_name}: ₹{float(spent):,.0f} spent of ₹{float(b.budget_amount):,.0f} budget (₹{remaining_b:,.0f} remaining)")
                    else:
                        lines.append(f"{cat_name}: ₹{float(spent):,.0f} spent of ₹{float(b.budget_amount):,.0f} budget (₹{abs(remaining_b):,.0f} over budget)")
                        recommendations.append(f"You are over budget on {cat_name} by ₹{abs(remaining_b):,.0f}.")
                answer = "Your budget status:\n" + "\n".join(lines)
            else:
                answer = "You haven't set any monthly budgets yet."

        elif intent == "budget_overspending":
            budgets = db.query(Budget).filter(
                Budget.user_id == user_id,
                Budget.period == "monthly",
            ).all()
            overspent = []
            for b in budgets:
                spent = db.query(func.sum(Expense.amount)).filter(
                    Expense.user_id == user_id,
                    Expense.category_id == b.category_id,
                    Expense.expense_date >= current_month_start,
                ).scalar() or Decimal("0")
                if float(spent) > float(b.budget_amount):
                    cat_name = db.query(Category.name).filter(Category.id == b.category_id).scalar() or "Unknown"
                    overspent.append(f"{cat_name}: ₹{abs(float(b.budget_amount) - float(spent)):,.0f} over budget")
                    recommendations.append(f"You're overspending on {cat_name}. Review and adjust your spending.")
            if overspent:
                answer = "Overspending alerts:\n" + "\n".join(overspent)
            else:
                answer = "You're within budget on all your categories this month. Well done!"

        elif intent == "subscriptions_renewals":
            upcoming = db.query(Subscription).filter(
                Subscription.user_id == user_id,
                Subscription.is_active == True,
                Subscription.renewal_date >= today,
                Subscription.renewal_date <= today + timedelta(days=30),
            ).order_by(Subscription.renewal_date).all()
            if upcoming:
                lines = []
                for s in upcoming:
                    lines.append(f"{s.service_name}: ₹{float(s.amount):,.0f} on {s.renewal_date}")
                answer = "Upcoming subscription renewals (next 30 days):\n" + "\n".join(lines)
                total_upcoming = sum(float(s.amount) for s in upcoming)
                recommendations.append(f"You have {len(upcoming)} subscriptions renewing soon totaling ₹{total_upcoming:,.0f}.")
            else:
                answer = "No subscriptions are due for renewal in the next 30 days."

        elif intent == "subscriptions_total":
            subs = db.query(Subscription).filter(
                Subscription.user_id == user_id,
                Subscription.is_active == True,
            ).all()
            if subs:
                total_monthly = Decimal("0")
                for s in subs:
                    if s.billing_cycle == "monthly":
                        total_monthly += s.amount
                    elif s.billing_cycle == "yearly":
                        total_monthly += s.amount / 12
                    elif s.billing_cycle == "quarterly":
                        total_monthly += s.amount / 3
                    else:
                        total_monthly += s.amount
                answer = f"You have {len(subs)} active subscriptions totaling ₹{float(total_monthly):,.0f} per month."
                if float(total_monthly) > 5000:
                    recommendations.append(f"Your monthly subscription cost is ₹{float(total_monthly):,.0f}. Consider reviewing unused subscriptions to save money.")
                else:
                    recommendations.append(f"Your monthly subscription cost is ₹{float(total_monthly):,.0f}, which is reasonable.")
            else:
                answer = "You have no active subscriptions."

        elif intent == "food_spending":
            total_food = db.query(func.sum(Expense.amount)).join(
                Category, Expense.category_id == Category.id
            ).filter(
                Expense.user_id == user_id,
                Expense.expense_date >= current_month_start,
                func.lower(Category.name).like("%food%"),
            ).scalar() or Decimal("0")
            total_all = db.query(func.sum(Expense.amount)).filter(
                Expense.user_id == user_id,
                Expense.expense_date >= current_month_start,
            ).scalar() or Decimal("0")
            if float(total_food) > 0 and float(total_all) > 0:
                pct = (float(total_food) / float(total_all)) * 100
                answer = f"You spent ₹{float(total_food):,.0f} on Food this month, which is {pct:.0f}% of your total expenses."
                if pct > 40:
                    recommendations.append(f"Food is {pct:.0f}% of your total spending. Reducing food expenses by 10% could save ₹{float(total_food) * 0.1:,.0f}/month.")
            elif float(total_food) > 0:
                answer = f"You spent ₹{float(total_food):,.0f} on Food this month."
            else:
                answer = "You have no food expenses recorded this month."

        elif intent == "recommendations" or not answer:
            recommendations = self._generate_recommendations(user_id, db, today, current_month_start)
            if recommendations:
                answer = "Here are my personalized financial recommendations:\n" + "\n".join(f"• {r}" for r in recommendations[:5])
            else:
                answer = "I don't have enough data to generate recommendations yet. Start adding your income and expenses!"

        if not answer:
            answer = "I'm not sure how to answer that. Try asking about your spending, income, savings, debt, budgets, or subscriptions."

        return {
            "answer": answer,
            "intent": intent,
            "recommendations": recommendations,
        }

    def _generate_recommendations(self, user_id: uuid.UUID, db: Session, today: date, current_month_start: date) -> list[str]:
        recs = []

        total_income = float(db.query(func.sum(Income.amount)).filter(
            Income.user_id == user_id,
            Income.income_date >= current_month_start,
        ).scalar() or Decimal("0"))

        total_expenses = float(db.query(func.sum(Expense.amount)).filter(
            Expense.user_id == user_id,
            Expense.expense_date >= current_month_start,
        ).scalar() or Decimal("0"))

        if total_income > 0:
            rate = ((total_income - total_expenses) / total_income) * 100
            if rate < 10:
                recs.append(f"Your savings rate is only {rate:.0f}%. Try to save at least 20% of your income.")
            elif rate >= 30:
                recs.append(f"Your savings rate of {rate:.0f}% is excellent! Consider investing for long-term growth.")

        food_spent = float(db.query(func.sum(Expense.amount)).join(
            Category, Expense.category_id == Category.id
        ).filter(
            Expense.user_id == user_id,
            Expense.expense_date >= current_month_start,
            func.lower(Category.name).like("%food%"),
        ).scalar() or Decimal("0"))

        if food_spent > 0 and total_expenses > 0:
            food_pct = (food_spent / total_expenses) * 100
            if food_pct > 30:
                savings = food_spent * 0.15
                recs.append(f"Food is {food_pct:.0f}% of your spending. Reducing by 15% saves ₹{savings:,.0f}/month.")

        debts = db.query(Debt).filter(
            Debt.user_id == user_id,
            Debt.status == "active",
        ).all()
        if debts:
            total_debt = sum(float(d.total_amount or 0) for d in debts)
            paid_debt = sum(float(d.paid_amount or 0) for d in debts)
            remaining = total_debt - paid_debt
            if total_debt > 0:
                pct = (paid_debt / total_debt) * 100
                recs.append(f"You are {pct:.0f}% through your debt payoff journey (₹{remaining:,.0f} remaining).")

        upcoming_subs = db.query(Subscription).filter(
            Subscription.user_id == user_id,
            Subscription.is_active == True,
            Subscription.renewal_date >= today,
            Subscription.renewal_date <= today + timedelta(days=7),
        ).count()
        if upcoming_subs > 0:
            recs.append(f"You have {upcoming_subs} subscription(s) renewing in the next 7 days.")

        budgets = db.query(Budget).filter(
            Budget.user_id == user_id,
            Budget.period == "monthly",
        ).all()
        for b in budgets:
            spent = float(db.query(func.sum(Expense.amount)).filter(
                Expense.user_id == user_id,
                Expense.category_id == b.category_id,
                Expense.expense_date >= current_month_start,
            ).scalar() or Decimal("0"))
            if spent > float(b.budget_amount):
                cat_name = db.query(Category.name).filter(Category.id == b.category_id).scalar() or "Unknown"
                recs.append(f"You're over budget on {cat_name} by ₹{spent - float(b.budget_amount):,.0f}.")

        return recs


class FinancialAssistantService:
    def __init__(self, db: Session):
        self.db = db
        self._rule_provider = RuleBasedProvider()
        from app.services.provider_factory import create_ai_provider
        self.provider, self.provider_name = create_ai_provider()
        logger.info("ai_provider_initialized", provider=self.provider_name)

    def ask(self, message: str, user_id: Union[str, uuid.UUID]) -> dict:
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)

        provider_used = self.provider_name
        result = None

        try:
            if self.provider_name == "gemini":
                logger.info("using_gemini")
                result = self.provider.ask(message, user_id, self.db)
                if "error" in result and result["error"]:
                    raise Exception(result.get("error_message", "Gemini returned an error"))
            else:
                logger.info("using_rule_based_provider")
                result = self.provider.ask(message, user_id, self.db)
        except Exception as e:
            error_str = str(e)
            logger.warning("gemini_failed_switching_to_rule_based_provider",
                           user_id=str(user_id),
                           error=error_str)

            if "429" in error_str or "Quota" in error_str or "quota" in error_str:
                logger.warning("gemini_quota_fallback",
                               user_id=str(user_id),
                               model="gemini-2.0-flash",
                               error=error_str)

            result = self._rule_provider.ask(message, user_id, self.db)
            provider_used = "gemini_fallback"

        if result is None:
            logger.info("using_rule_based_provider_emergency")
            result = self._rule_provider.ask(message, user_id, self.db)
            provider_used = "rule_emergency"

        chat = ChatHistory(
            user_id=user_id,
            question=message,
            answer=result["answer"],
            intent=result["intent"],
            provider=provider_used,
        )
        self.db.add(chat)
        self.db.commit()

        logger.info("chat_response",
                    user_id=str(user_id),
                    intent=result["intent"],
                    provider=provider_used)

        return result

    def get_history(self, user_id: Union[str, uuid.UUID], limit: int = 50) -> list[dict]:
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        rows = self.db.query(ChatHistory).filter(
            ChatHistory.user_id == user_id,
        ).order_by(ChatHistory.created_at.desc()).limit(limit).all()
        return [
            {
                "id": str(r.id),
                "question": r.question,
                "answer": r.answer,
                "intent": r.intent,
                "provider": r.provider,
                "created_at": r.created_at.isoformat() if r.created_at else "",
            }
            for r in rows
        ]

    def get_recommendation_count(self, user_id: Union[str, uuid.UUID]) -> int:
        if isinstance(user_id, str):
            user_id = uuid.UUID(user_id)
        context_service = FinancialContextService(self.db)
        context = context_service.get_context(user_id)
        score = context.financial_health_score
        count = 0
        if context.savings_rate < 20:
            count += 1
        if context.debt_remaining > 0:
            count += 1
        if any(b["remaining"] < 0 for b in context.budget_status):
            count += 1
        return min(count, 9)
