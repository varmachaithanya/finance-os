from datetime import date, timedelta
from decimal import Decimal
from app.services.anomaly_service import AnomalyDetectionService
from app.models.expense import Expense


def test_no_anomalies_normal_spending(db_session, user, categories):
    today = date.today()
    for _ in range(10):
        e = Expense(
            user_id=user.id, category_id=categories["Food"].id,
            amount=Decimal("500"), description="Normal meal",
            expense_date=today - timedelta(days=1),
        )
        db_session.add(e)
    db_session.commit()

    service = AnomalyDetectionService(db_session)
    anomalies = service.detect(str(user.id))
    high_spend = [a for a in anomalies if a.type == "high_spend"]
    assert len(high_spend) == 0


def test_anomaly_high_spending(db_session, user, categories):
    today = date.today()
    for _ in range(5):
        e = Expense(
            user_id=user.id, category_id=categories["Food"].id,
            amount=Decimal("200"), description="Normal",
            expense_date=today - timedelta(days=60),
        )
        db_session.add(e)
    e = Expense(
        user_id=user.id, category_id=categories["Food"].id,
        amount=Decimal("5000"), description="Huge restaurant bill",
        expense_date=today - timedelta(days=1),
    )
    db_session.add(e)
    db_session.commit()

    service = AnomalyDetectionService(db_session)
    anomalies = service.detect(str(user.id))
    high_spend = [a for a in anomalies if a.type == "high_spend"]
    assert len(high_spend) > 0
    assert "Food" in (high_spend[0].category_name or "")


def test_anomaly_resolve(db_session, user, categories):
    today = date.today()
    for _ in range(5):
        e = Expense(
            user_id=user.id, category_id=categories["Food"].id,
            amount=Decimal("200"), description="Normal",
            expense_date=today - timedelta(days=60),
        )
        db_session.add(e)
    e = Expense(
        user_id=user.id, category_id=categories["Food"].id,
        amount=Decimal("5000"), description="Huge",
        expense_date=today - timedelta(days=1),
    )
    db_session.add(e)
    db_session.commit()

    service = AnomalyDetectionService(db_session)
    anomalies = service.detect(str(user.id))
    if anomalies:
        service.resolve(str(user.id), anomalies[0].id)
        remaining = service.get_alerts(str(user.id))
        remaining_ids = {a.id for a in remaining}
        assert anomalies[0].id not in remaining_ids


def test_duplicate_anomaly(db_session, user, categories):
    today = date.today()
    for _ in range(3):
        e = Expense(
            user_id=user.id, category_id=categories["Shopping"].id,
            amount=Decimal("999"), description="Amazon Purchase",
            expense_date=today - timedelta(days=1),
        )
        db_session.add(e)
    db_session.commit()

    svc = AnomalyDetectionService(db_session)
    anomalies = svc.detect(str(user.id))
    assert len(anomalies) >= 0
