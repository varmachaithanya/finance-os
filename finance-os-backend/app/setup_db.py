from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Base

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    seed_default_categories()


def seed_default_categories():
    db = Session(engine)
    try:
        existing = db.execute(
            text("SELECT COUNT(*) FROM categories WHERE is_default = TRUE")
        ).scalar()

        if existing and existing > 0:
            return

        default_categories = [
            {"name": "Food", "type": "expense", "icon": "restaurant", "color": "#FF6B6B", "is_default": True},
            {"name": "Travel", "type": "expense", "icon": "flight", "color": "#4ECDC4", "is_default": True},
            {"name": "Fuel", "type": "expense", "icon": "local_gas_station", "color": "#45B7D1", "is_default": True},
            {"name": "Shopping", "type": "expense", "icon": "shopping_bag", "color": "#96CEB4", "is_default": True},
            {"name": "Medical", "type": "expense", "icon": "local_hospital", "color": "#FFEAA7", "is_default": True},
            {"name": "Entertainment", "type": "expense", "icon": "movie", "color": "#DDA0DD", "is_default": True},
            {"name": "Utilities", "type": "expense", "icon": "bolt", "color": "#98D8C8", "is_default": True},
            {"name": "OTT Subscriptions", "type": "expense", "icon": "tv", "color": "#F7DC6F", "is_default": True},
            {"name": "Mobile Recharge", "type": "expense", "icon": "phone_android", "color": "#BB8FCE", "is_default": True},
            {"name": "Other", "type": "expense", "icon": "category", "color": "#AEB6BF", "is_default": True},
            {"name": "Salary", "type": "income", "icon": "work", "color": "#2ECC71", "is_default": True},
            {"name": "Freelancing", "type": "income", "icon": "laptop", "color": "#27AE60", "is_default": True},
            {"name": "Business", "type": "income", "icon": "business", "color": "#1ABC9C", "is_default": True},
            {"name": "Investment", "type": "income", "icon": "trending_up", "color": "#16A085", "is_default": True},
            {"name": "Other", "type": "income", "icon": "attach_money", "color": "#AEB6BF", "is_default": True},
        ]

        from app.models.category import Category
        for cat_data in default_categories:
            category = Category(
                name=cat_data["name"],
                type=cat_data["type"],
                icon=cat_data["icon"],
                color=cat_data["color"],
                is_default=cat_data["is_default"],
                user_id=None
            )
            db.add(category)

        db.commit()
        print("Default categories seeded successfully")

    except Exception as e:
        db.rollback()
        print(f"Error seeding categories: {e}")
        raise
    finally:
        db.close()
