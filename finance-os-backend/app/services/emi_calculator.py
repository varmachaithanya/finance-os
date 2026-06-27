from decimal import Decimal, ROUND_HALF_UP
from app.schemas.ai import EMIRequest, EMIResponse, EMIScheduleRow


def calculate_emi(req: EMIRequest) -> EMIResponse:
    P = float(req.loan_amount)
    R = req.interest_rate / 12 / 100
    N = req.tenure_months

    if R == 0:
        monthly_emi = P / N
    else:
        monthly_emi = P * R * ((1 + R) ** N) / (((1 + R) ** N) - 1)

    schedule = []
    balance = P
    total_interest = 0.0

    for month in range(1, N + 1):
        interest = balance * R
        principal = monthly_emi - interest
        balance -= principal
        if balance < 0:
            balance = 0
        total_interest += interest
        schedule.append(EMIScheduleRow(
            month=month,
            emi=Decimal(str(round(monthly_emi, 2))),
            principal=Decimal(str(round(principal, 2))),
            interest=Decimal(str(round(interest, 2))),
            balance=Decimal(str(round(balance, 2))),
        ))

    total_payment = monthly_emi * N
    principal_pct = round(P / total_payment * 100, 1) if total_payment > 0 else 0

    return EMIResponse(
        monthly_emi=Decimal(str(round(monthly_emi, 2))),
        total_interest=Decimal(str(round(total_interest, 2))),
        total_payment=Decimal(str(round(total_payment, 2))),
        loan_amount=req.loan_amount,
        interest_rate=req.interest_rate,
        tenure_months=req.tenure_months,
        amortization_schedule=schedule,
        principal_percentage=principal_pct,
        interest_percentage=round(100 - principal_pct, 1),
    )
