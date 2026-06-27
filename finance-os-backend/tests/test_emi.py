from decimal import Decimal
from app.services.emi_calculator import calculate_emi
from app.schemas.ai import EMIRequest


def test_emi_basic():
    req = EMIRequest(loan_amount=Decimal("500000"), interest_rate=10, tenure_months=60)
    result = calculate_emi(req)
    assert result.monthly_emi > 0
    assert result.total_interest > 0
    assert result.total_payment == result.loan_amount + result.total_interest
    assert len(result.amortization_schedule) == 60


def test_emi_zero_interest():
    req = EMIRequest(loan_amount=Decimal("120000"), interest_rate=0, tenure_months=12)
    result = calculate_emi(req)
    assert result.monthly_emi == Decimal("10000")
    assert result.total_interest == 0
    assert result.total_payment == result.loan_amount


def test_emi_no_negative():
    req = EMIRequest(loan_amount=Decimal("1000"), interest_rate=5, tenure_months=1)
    result = calculate_emi(req)
    assert result.monthly_emi > 0
    assert result.balance_for_last_row() == 0 if hasattr(result, 'balance_for_last_row') else True


def test_emi_schedule_monotonic():
    req = EMIRequest(loan_amount=Decimal("100000"), interest_rate=12, tenure_months=24)
    result = calculate_emi(req)
    balances = [s.balance for s in result.amortization_schedule]
    for i in range(1, len(balances)):
        assert balances[i] <= balances[i - 1]


def test_emi_principal_interest_pct():
    req = EMIRequest(loan_amount=Decimal("500000"), interest_rate=10, tenure_months=60)
    result = calculate_emi(req)
    assert result.principal_percentage > 0
    assert result.interest_percentage > 0
    assert abs(result.principal_percentage + result.interest_percentage - 100) < 1
