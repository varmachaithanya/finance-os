"""Initial schema

Revision ID: 001
Revises:
Create Date: 2024-01-01 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("currency", sa.String(10), server_default="INR"),
        sa.Column("timezone", sa.String(50), server_default="Asia/Kolkata"),
        sa.Column("avatar_url", sa.String(500), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "categories",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("type", sa.String(20), nullable=False),
        sa.Column("icon", sa.String(50), nullable=True),
        sa.Column("color", sa.String(20), nullable=True),
        sa.Column("is_default", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_categories_user_id", "categories", ["user_id"])

    op.create_table(
        "expenses",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("category_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("categories.id"), nullable=True),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("payment_method", sa.String(50), nullable=True),
        sa.Column("expense_date", sa.Date(), nullable=False),
        sa.Column("is_recurring", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("ai_category_suggestion", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_expenses_user_id", "expenses", ["user_id"])
    op.create_index("ix_expenses_category_id", "expenses", ["category_id"])
    op.create_index("ix_expenses_user_date", "expenses", ["user_id", "expense_date"])

    op.create_table(
        "income",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source", sa.String(100), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("description", sa.String(500), nullable=True),
        sa.Column("income_date", sa.Date(), nullable=False),
        sa.Column("is_recurring", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_income_user_id", "income", ["user_id"])
    op.create_index("ix_income_user_date", "income", ["user_id", "income_date"])

    op.create_table(
        "credit_cards",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("bank_name", sa.String(100), nullable=False),
        sa.Column("card_name", sa.String(100), nullable=False),
        sa.Column("last_four_digits", sa.String(4), nullable=True),
        sa.Column("credit_limit", sa.Numeric(12, 2), nullable=False),
        sa.Column("outstanding_balance", sa.Numeric(12, 2), server_default=sa.text("0")),
        sa.Column("minimum_due", sa.Numeric(12, 2), server_default=sa.text("0")),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_credit_cards_user_id", "credit_cards", ["user_id"])

    op.create_table(
        "debts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("lender_name", sa.String(200), nullable=False),
        sa.Column("debt_type", sa.String(50), nullable=False),
        sa.Column("total_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("paid_amount", sa.Numeric(12, 2), server_default=sa.text("0")),
        sa.Column("emi_amount", sa.Numeric(12, 2), nullable=True),
        sa.Column("interest_rate", sa.Numeric(5, 2), nullable=True),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("status", sa.String(20), server_default="active"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_debts_user_id", "debts", ["user_id"])

    op.create_table(
        "subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("service_name", sa.String(100), nullable=False),
        sa.Column("category", sa.String(50), nullable=True),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("billing_cycle", sa.String(20), server_default="monthly"),
        sa.Column("renewal_date", sa.Date(), nullable=False),
        sa.Column("auto_renewal", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("notes", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_subscriptions_user_id", "subscriptions", ["user_id"])

    op.create_table(
        "budgets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("category_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("categories.id"), nullable=False),
        sa.Column("budget_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("period", sa.String(20), server_default="monthly"),
        sa.Column("month", sa.Integer(), nullable=True),
        sa.Column("year", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_budgets_user_id", "budgets", ["user_id"])
    op.create_index("ix_budgets_user_period", "budgets", ["user_id", "year", "month"])
    op.create_unique_constraint("uq_user_category_month_year", "budgets", ["user_id", "category_id", "month", "year"])

    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("title", sa.String(200), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("entity_type", sa.String(50), nullable=True),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("is_read", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
    op.create_index("ix_notifications_user_unread", "notifications", ["user_id", "is_read"])

    # Seed default categories
    expense_categories = [
        ("Food", "restaurant", "#FF5722"),
        ("Travel", "directions_car", "#2196F3"),
        ("Fuel", "local_gas_station", "#FF9800"),
        ("Shopping", "shopping_cart", "#E91E63"),
        ("Medical", "local_hospital", "#4CAF50"),
        ("Entertainment", "movie", "#9C27B0"),
        ("Utilities", "bolt", "#607D8B"),
        ("OTT Subscriptions", "tv", "#00BCD4"),
        ("Mobile Recharge", "phone_android", "#3F51B5"),
        ("Other Expense", "more_horiz", "#795548"),
    ]

    income_categories = [
        ("Salary", "work", "#4CAF50"),
        ("Freelancing", "laptop", "#2196F3"),
        ("Business", "store", "#FF9800"),
        ("Investment", "trending_up", "#9C27B0"),
        ("Other Income", "more_horiz", "#795548"),
    ]

    categories_table = sa.table(
        "categories",
        sa.column("id", postgresql.UUID),
        sa.column("user_id", postgresql.UUID),
        sa.column("name", sa.String),
        sa.column("type", sa.String),
        sa.column("icon", sa.String),
        sa.column("color", sa.String),
        sa.column("is_default", sa.Boolean),
    )

    for name, icon, color in expense_categories:
        op.execute(
            categories_table.insert().values(
                name=name,
                type="expense",
                icon=icon,
                color=color,
                is_default=True,
            )
        )

    for name, icon, color in income_categories:
        op.execute(
            categories_table.insert().values(
                name=name,
                type="income",
                icon=icon,
                color=color,
                is_default=True,
            )
        )


def downgrade() -> None:
    op.drop_table("notifications")
    op.drop_table("budgets")
    op.drop_table("subscriptions")
    op.drop_table("debts")
    op.drop_table("credit_cards")
    op.drop_table("income")
    op.drop_table("expenses")
    op.drop_table("categories")
    op.drop_table("users")
