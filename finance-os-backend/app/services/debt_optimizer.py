import uuid
from decimal import Decimal
from typing import Union
from sqlalchemy.orm import Session
from app.models.debt import Debt
from app.schemas.ai import DebtPayoffPlan, DebtPayoffResponse, EMIScheduleRow


def _to_uuid(value: Union[str, uuid.UUID]) -> uuid.UUID:
    return uuid.UUID(value) if isinstance(value, str) else value


def compute_payoff_plan(debt: Debt, monthly_payment: float, strategy: str) -> dict:
    balance = float(debt.total_amount)
    rate = float(debt.interest_rate) / 100 / 12 if debt.interest_rate else 0
    min_payment = float(debt.emi_amount) if debt.emi_amount else max(monthly_payment * 0.1, 100)

    schedule = []
    months = 0
    total_interest = 0
    remaining = balance

    while remaining > 0 and months < 600:
        months += 1
        interest = remaining * rate
        payment = max(min_payment, min(monthly_payment, remaining + interest))
        if payment > remaining + interest:
            payment = remaining + interest
        principal = payment - interest
        remaining -= principal
        total_interest += interest
        if remaining < 0:
            remaining = 0
        schedule.append({
            "month": months,
            "payment": round(payment, 2),
            "principal": round(principal, 2),
            "interest": round(interest, 2),
            "balance": round(remaining, 2),
        })

    return {
        "schedule": schedule,
        "months": months,
        "total_interest": round(total_interest, 2),
        "total_principal": round(balance, 2),
    }


def _round_decimal(value: float) -> Decimal:
    return Decimal(str(round(value, 2)))


class DebtOptimizerService:
    def __init__(self, db: Session):
        self.db = db

    def generate_plan(self, user_id: Union[str, uuid.UUID], monthly_budget: float = 0) -> DebtPayoffResponse:
        user_id = _to_uuid(user_id)
        debts = (
            self.db.query(Debt)
            .filter(Debt.user_id == user_id, Debt.status.in_(["active", "overdue"]))
            .all()
        )
        if not debts:
            total_emi = 0
        else:
            total_emi = sum(float(d.emi_amount or 0) for d in debts)

        monthly_payment = monthly_budget if monthly_budget > 0 else max(total_emi * 1.2, total_emi + 500)

        debt_details = []
        for d in debts:
            debt_details.append({
                "id": str(d.id),
                "name": d.lender_name,
                "balance": float(d.total_amount),
                "rate": float(d.interest_rate) if d.interest_rate else 0,
                "min_payment": float(d.emi_amount) if d.emi_amount else monthly_payment * 0.1,
            })

        snowball_schedule = []
        remaining_debts_snow = sorted(debt_details, key=lambda x: x["balance"])
        snow_months = 0
        snow_interest = 0
        for d in remaining_debts_snow:
            debt_obj = next(x for x in debts if str(x.id) == d["id"])
            plan = compute_payoff_plan(debt_obj, monthly_payment, "snowball")
            snow_months += plan["months"]
            snow_interest += plan["total_interest"]
            snowball_schedule.extend(plan["schedule"])

        avalanche_schedule = []
        remaining_debts_av = sorted(debt_details, key=lambda x: -x["rate"])
        av_months = 0
        av_interest = 0
        for d in remaining_debts_av:
            debt_obj = next(x for x in debts if str(x.id) == d["id"])
            plan = compute_payoff_plan(debt_obj, monthly_payment, "avalanche")
            av_months += plan["months"]
            av_interest += plan["total_interest"]
            avalanche_schedule.extend(plan["schedule"])

        total_principal = sum(d["balance"] for d in debt_details)
        interest_saved = round(snow_interest - av_interest, 2) if snow_interest > av_interest else 0
        best = "avalanche" if av_interest <= snow_interest else "snowball"

        return DebtPayoffResponse(
            snowball=DebtPayoffPlan(
                strategy="snowball",
                months_to_debt_free=snow_months,
                total_interest_paid=_round_decimal(snow_interest),
                total_principal=Decimal(str(total_principal)),
                total_saved=Decimal("0"),
                schedule=snowball_schedule[:120],
            ),
            avalanche=DebtPayoffPlan(
                strategy="avalanche",
                months_to_debt_free=av_months,
                total_interest_paid=_round_decimal(av_interest),
                total_principal=Decimal(str(total_principal)),
                total_saved=Decimal(str(interest_saved)),
                schedule=avalanche_schedule[:120],
            ),
            best_strategy=best,
            interest_saved=Decimal(str(interest_saved)),
        )
