from datetime import date, timedelta
from decimal import Decimal
from app.services.savings_service import SavingsRecommendationEngine
from app.models.expense import Expense
from app.models.subscription import Subscription


def test_savings_no_data(db_session, user):
    engine = SavingsRecommendationEngine(db_session)
    suggestions = engine.generate(str(user.id))
    assert len(suggestions) == 0


def test_savings_general_suggestion(db_session, user, categories):
    today = date.today()
    for _ in range(5):
        for cat_name in ["Food", "Travel"]:
            e = Expense(
                user_id=user.id, category_id=categories[cat_name].id,
                amount=Decimal("2000"), description=f"Test {cat_name}",
                expense_date=today - timedelta(days=30),
            )
            db_session.add(e)
    db_session.commit()

    engine = SavingsRecommendationEngine(db_session)
    suggestions = engine.generate(str(user.id))
    assert len(suggestions) > 0
    assert any(s.type == "general" for s in suggestions)


def test_savings_subscription_cleanup(db_session, user, categories):
    today = date.today()
    for _ in range(3):
        e = Expense(
            user_id=user.id, category_id=categories["Food"].id,
            amount=Decimal("1000"), description="Food",
            expense_date=today - timedelta(days=30),
        )
        db_session.add(e)
    for i in range(8):
        sub = Subscription(
            user_id=user.id, service_name=f"Sub {i}", amount=Decimal("200"),
            billing_cycle="monthly", renewal_date=today,
            is_active=True,
        )
        db_session.add(sub)
    db_session.commit()

    engine = SavingsRecommendationEngine(db_session)
    suggestions = engine.generate(str(user.id))
    sub_suggestions = [s for s in suggestions if s.type == "subscriptions"]
    assert len(sub_suggestions) > 0


def test_savings_food_reduction(db_session, user, categories):
    today = date.today()
    for _ in range(5):
        e = Expense(
            user_id=user.id, category_id=categories["Food"].id,
            amount=Decimal("5000"), description="Food expense",
            expense_date=today - timedelta(days=30),
        )
        db_session.add(e)
    e = Expense(
        user_id=user.id, category_id=categories["Travel"].id,
        amount=Decimal("500"), description="Travel",
        expense_date=today - timedelta(days=30),
    )
    db_session.add(e)
    db_session.commit()

    engine = SavingsRecommendationEngine(db_session)
    suggestions = engine.generate(str(user.id))
    food_suggestions = [s for s in suggestions if s.type == "food_reduction"]
    assert len(food_suggestions) > 0


def test_savings_priority_order(db_session, user, categories):
    today = date.today()
    for _ in range(5):
        e = Expense(
            user_id=user.id, category_id=categories["Food"].id,
            amount=Decimal("8000"), description="Food expense",
            expense_date=today - timedelta(days=30),
        )
        db_session.add(e)
    db_session.commit()

    engine = SavingsRecommendationEngine(db_session)
    suggestions = engine.generate(str(user.id))
    if len(suggestions) >= 2:
        priorities = [s.priority for s in suggestions[:2]]
        assert priorities[0] in ("high", "medium")
