import uuid
import pytest
from datetime import date, timedelta
from decimal import Decimal
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from app.models.base import Base
from app.models.user import User
from app.models.category import Category
from app.models.expense import Expense
from app.models.debt import Debt
from app.models.subscription import Subscription


TEST_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(bind=engine)
    session = TestingSession()
    yield session
    session.close()


@pytest.fixture
def user(db_session: Session) -> User:
    u = User(
        id=TEST_USER_ID,
        email="test@example.com",
        password_hash="hash",
        full_name="Test User",
    )
    db_session.add(u)
    db_session.commit()
    return u


@pytest.fixture
def user_id_str() -> str:
    return str(TEST_USER_ID)


@pytest.fixture
def categories(db_session: Session) -> dict[str, Category]:
    names = ["Food", "Travel", "Shopping", "Utilities", "Entertainment"]
    cats = {}
    for name in names:
        c = Category(id=None, name=name, type="expense", user_id=None)
        db_session.add(c)
        db_session.flush()
        cats[name] = c
    db_session.commit()
    return cats


@pytest.fixture
def expenses(db_session: Session, user: User, categories: dict[str, Category]) -> list[Expense]:
    today = date.today()
    items = []
    for months_ago in range(6):
        for cat_name, amount in [("Food", Decimal("1200")), ("Travel", Decimal("800")), ("Shopping", Decimal("1500"))]:
            e = Expense(
                user_id=user.id,
                category_id=categories[cat_name].id,
                amount=amount * (months_ago + 1),
                description=f"Test {cat_name} {months_ago}",
                expense_date=today - timedelta(days=months_ago * 30 + 5),
            )
            db_session.add(e)
            items.append(e)
    db_session.commit()
    return items


@pytest.fixture
def debts(db_session: Session, user: User) -> list[Debt]:
    items = [
        Debt(user_id=user.id, lender_name="Bank A", debt_type="personal", total_amount=Decimal("50000"),
             interest_rate=Decimal("12"), emi_amount=Decimal("5000"), status="active"),
        Debt(user_id=user.id, lender_name="Bank B", debt_type="credit_card", total_amount=Decimal("30000"),
             interest_rate=Decimal("18"), emi_amount=Decimal("3000"), status="active"),
        Debt(user_id=user.id, lender_name="Bank C", debt_type="car", total_amount=Decimal("10000"),
             interest_rate=Decimal("8"), emi_amount=Decimal("1500"), status="active"),
    ]
    for d in items:
        db_session.add(d)
    db_session.commit()
    return items
