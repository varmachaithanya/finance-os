import uuid

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Base

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    seed_default_categories()


def seed_default_categories() -> None:
    with Session(engine) as db:
        existing = db.execute(text("SELECT COUNT(*) FROM categories WHERE is_default = 1")).scalar()
        if existing and existing > 0:
            return

        expense_categories = [
            ("Food", "expense", "restaurant", "#FF5722"),
            ("Travel", "expense", "directions_car", "#2196F3"),
            ("Fuel", "expense", "local_gas_station", "#FF9800"),
            ("Shopping", "expense", "shopping_cart", "#E91E63"),
            ("Medical", "expense", "local_hospital", "#4CAF50"),
            ("Entertainment", "expense", "movie", "#9C27B0"),
            ("Utilities", "expense", "bolt", "#607D8B"),
            ("OTT Subscriptions", "expense", "tv", "#00BCD4"),
            ("Mobile Recharge", "expense", "phone_android", "#3F51B5"),
            ("Other Expense", "expense", "more_horiz", "#795548"),
        ]

        income_categories = [
            ("Salary", "income", "work", "#4CAF50"),
            ("Freelancing", "income", "laptop", "#2196F3"),
            ("Business", "income", "store", "#FF9800"),
            ("Investment", "income", "trending_up", "#9C27B0"),
            ("Other Income", "income", "more_horiz", "#795548"),
        ]

        for name, typ, icon, color in expense_categories + income_categories:
            from sqlalchemy import insert
            from app.models.category import Category
            cat = Category(name=name, type=typ, icon=icon, color=color, is_default=True)
            db.add(cat)
        db.commit()
