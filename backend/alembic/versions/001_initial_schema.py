"""initial schema — all 11 tables

Revision ID: 001_initial
Revises: None
Create Date: 2026-11-08
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- users ---
    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column(
            "role",
            sa.Enum("customer", "owner", "delivery", name="userrole"),
            nullable=False,
        ),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("address", sa.Text, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    # --- restaurants ---
    op.create_table(
        "restaurants",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("owner_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("cuisine_type", sa.String(100), nullable=True),
        sa.Column("address", sa.String(500), nullable=True),
        sa.Column("phone", sa.String(20), nullable=True),
        sa.Column("image_url", sa.String(500), nullable=True),
        sa.Column("avg_rating", sa.Numeric(3, 2), nullable=False, server_default=sa.text("0.00")),
        sa.Column("total_reviews", sa.Integer, nullable=False, server_default=sa.text("0")),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_restaurants_owner_id", "restaurants", ["owner_id"])

    # --- menu_items ---
    op.create_table(
        "menu_items",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("restaurant_id", sa.Integer, sa.ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column("image_url", sa.String(500), nullable=True),
        sa.Column("is_available", sa.Boolean, nullable=False, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_menu_items_restaurant_id", "menu_items", ["restaurant_id"])

    # --- orders ---
    op.create_table(
        "orders",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("customer_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("restaurant_id", sa.Integer, sa.ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "status",
            sa.Enum(
                "PLACED", "ACCEPTED", "PREPARING", "READY", "ASSIGNED",
                "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "REFUNDED",
                name="orderstatus",
            ),
            nullable=False,
            server_default="PLACED",
        ),
        sa.Column("total_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("delivery_address", sa.String(500), nullable=False),
        sa.Column("special_instructions", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_orders_customer_id", "orders", ["customer_id"])
    op.create_index("ix_orders_restaurant_id", "orders", ["restaurant_id"])
    op.create_index("ix_orders_status", "orders", ["status"])

    # --- order_items ---
    op.create_table(
        "order_items",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("order_id", sa.Integer, sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("menu_item_id", sa.Integer, sa.ForeignKey("menu_items.id", ondelete="SET NULL"), nullable=True),
        sa.Column("item_name", sa.String(255), nullable=False),
        sa.Column("unit_price", sa.Numeric(10, 2), nullable=False),
        sa.Column("quantity", sa.Integer, nullable=False),
        sa.Column("subtotal", sa.Numeric(10, 2), nullable=False),
    )
    op.create_index("ix_order_items_order_id", "order_items", ["order_id"])

    # --- reviews ---
    op.create_table(
        "reviews",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("order_id", sa.Integer, sa.ForeignKey("orders.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("customer_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("restaurant_id", sa.Integer, sa.ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("rating", sa.Integer, nullable=False),
        sa.Column("comment", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_reviews_customer_id", "reviews", ["customer_id"])
    op.create_index("ix_reviews_restaurant_id", "reviews", ["restaurant_id"])

    # --- payment_ledger ---
    op.create_table(
        "payment_ledger",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("order_id", sa.Integer, sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "entry_type",
            sa.Enum("payment", "refund", name="paymententrytype"),
            nullable=False,
        ),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column(
            "status",
            sa.Enum("mock_paid", "refunded", name="paymentstatus"),
            nullable=False,
        ),
        sa.Column("reference_id", sa.String(100), unique=True, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_payment_ledger_order_id", "payment_ledger", ["order_id"])

    # --- return_requests ---
    op.create_table(
        "return_requests",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("order_id", sa.Integer, sa.ForeignKey("orders.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("customer_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("reason", sa.Text, nullable=False),
        sa.Column(
            "status",
            sa.Enum("pending", "approved", "rejected", name="returnrequeststatus"),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("resolved_at", sa.DateTime, nullable=True),
    )
    op.create_index("ix_return_requests_customer_id", "return_requests", ["customer_id"])

    # --- refund_records ---
    op.create_table(
        "refund_records",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("order_id", sa.Integer, sa.ForeignKey("orders.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("return_request_id", sa.Integer, sa.ForeignKey("return_requests.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    # --- delivery_assignments ---
    op.create_table(
        "delivery_assignments",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("order_id", sa.Integer, sa.ForeignKey("orders.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("delivery_partner_id", sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "status",
            sa.Enum("ASSIGNED", "OUT_FOR_DELIVERY", "DELIVERED", name="deliverystatus"),
            nullable=False,
            server_default="ASSIGNED",
        ),
        sa.Column("assigned_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("picked_up_at", sa.DateTime, nullable=True),
        sa.Column("delivered_at", sa.DateTime, nullable=True),
    )
    op.create_index("ix_delivery_assignments_partner_id", "delivery_assignments", ["delivery_partner_id"])

    # --- reminder_logs ---
    op.create_table(
        "reminder_logs",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("order_id", sa.Integer, sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("message", sa.String(500), nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_reminder_logs_order_id", "reminder_logs", ["order_id"])


def downgrade() -> None:
    op.drop_table("reminder_logs")
    op.drop_table("delivery_assignments")
    op.drop_table("refund_records")
    op.drop_table("return_requests")
    op.drop_table("payment_ledger")
    op.drop_table("reviews")
    op.drop_table("order_items")
    op.drop_table("orders")
    op.drop_table("menu_items")
    op.drop_table("restaurants")
    op.drop_table("users")
    # Drop enum types created by MySQL
    if op.get_bind().dialect.name == "postgresql":
        op.execute("DROP TYPE IF EXISTS userrole")
    if op.get_bind().dialect.name == "postgresql":
        op.execute("DROP TYPE IF EXISTS orderstatus")
    if op.get_bind().dialect.name == "postgresql":
        op.execute("DROP TYPE IF EXISTS paymententrytype")
    if op.get_bind().dialect.name == "postgresql":
        op.execute("DROP TYPE IF EXISTS paymentstatus")
    if op.get_bind().dialect.name == "postgresql":
        op.execute("DROP TYPE IF EXISTS returnrequeststatus")
    if op.get_bind().dialect.name == "postgresql":
        op.execute("DROP TYPE IF EXISTS deliverystatus")

