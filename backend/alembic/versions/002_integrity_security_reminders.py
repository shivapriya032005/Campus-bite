"""integrity, approval, reminder lifecycle, rate limiting, indexes

* users.is_approved (existing accounts stay approved)
* restaurants.rating_sum (exact, atomically maintained rating aggregate)
* payment_ledger: VOID / VOIDED values + UNIQUE(order_id, entry_type)
* MySQL enum labels aligned with the ORM (upper-case names; fixes LookupError on read)
* reminder_logs: lifecycle columns, de-duplication, UNIQUE(order_id, trigger_status)
* rate_limit_counters, scheduler_leases tables
* composite indexes for the hot order / review / delivery queries

Revision ID: 002_integrity
Revises: 001_initial
Create Date: 2026-11-13
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "002_integrity"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _drop_index_if_exists(name: str, table: str, alt_names: tuple = ()) -> None:
    """Drop an index by any of its known names. Databases created via ``create_all`` (instead of
    migration 001) name some indexes differently, so a missing name must not abort the upgrade."""
    existing = {ix["name"] for ix in sa.inspect(op.get_bind()).get_indexes(table)}
    for candidate in (name, *alt_names):
        if candidate in existing:
            op.drop_index(candidate, table_name=table)
            return


def _is_mysql() -> bool:
    return op.get_bind().dialect.name == "mysql"


# (table, column, enum name, labels in migration 001, labels at this revision, server default)
_ENUM_COLUMNS = [
    ("users", "role", "userrole", ["customer", "owner", "delivery"],
     ["CUSTOMER", "OWNER", "DELIVERY"], None),
    ("payment_ledger", "entry_type", "paymententrytype", ["payment", "refund"],
     ["PAYMENT", "REFUND", "VOID"], None),
    ("payment_ledger", "status", "paymentstatus", ["mock_paid", "refunded"],
     ["MOCK_PAID", "REFUNDED", "VOIDED"], None),
    ("return_requests", "status", "returnrequeststatus", ["pending", "approved", "rejected"],
     ["PENDING", "APPROVED", "REJECTED"], "PENDING"),
]


def _convert_enum(table, column, name, old_labels, new_labels, default, to_upper: bool) -> None:
    """Re-create a MySQL ENUM column with different labels, converting the stored values.

    The ORM persists enum *names* (``CUSTOMER``), but migration 001 created lower-case labels
    (``customer``); reading any such row back raised ``LookupError`` on MySQL.
    """
    src_labels, dst_labels = (old_labels, new_labels) if to_upper else (new_labels, old_labels)
    src_default = (default if to_upper is False else (default.lower() if default else None))
    dst_default = (default if to_upper else (default.lower() if default else None))
    op.alter_column(
        table, column, existing_type=sa.Enum(*src_labels, name=name), type_=sa.String(20),
        existing_nullable=False, server_default=None,
    )
    op.execute(f"UPDATE {table} SET {column} = {'UPPER' if to_upper else 'LOWER'}({column})")
    op.alter_column(
        table, column, existing_type=sa.String(20), type_=sa.Enum(*dst_labels, name=name),
        existing_nullable=False, server_default=dst_default,
    )


def upgrade() -> None:
    # --- users: admin approval for owners / delivery partners -------------------------------
    op.add_column(
        "users",
        sa.Column("is_approved", sa.Boolean, nullable=False, server_default=sa.text("1")),
    )

    # --- restaurants: exact rating aggregate -----------------------------------------------
    op.add_column(
        "restaurants",
        sa.Column("rating_sum", sa.Integer, nullable=False, server_default=sa.text("0")),
    )
    op.execute("UPDATE restaurants SET rating_sum = ROUND(avg_rating * total_reviews)")

    # --- payment ledger: void entries, one entry per type per order ------------------------
    if _is_mysql():
        for table, column, name, old_labels, new_labels, default in _ENUM_COLUMNS:
            _convert_enum(table, column, name, old_labels, new_labels, default, to_upper=True)
    op.create_index(
        "uq_payment_ledger_order_entry", "payment_ledger", ["order_id", "entry_type"], unique=True
    )

    # --- reminder logs: lifecycle ----------------------------------------------------------
    op.add_column(
        "reminder_logs",
        sa.Column("trigger_status", sa.String(20), nullable=False, server_default="PLACED"),
    )
    op.add_column(
        "reminder_logs",
        sa.Column(
            "status",
            sa.Enum("ACTIVE", "RESOLVED", "DISMISSED", name="reminderstatus"),
            nullable=False,
            server_default="ACTIVE",
        ),
    )
    op.add_column("reminder_logs", sa.Column("resolved_at", sa.DateTime, nullable=True))
    op.add_column("reminder_logs", sa.Column("dismissed_at", sa.DateTime, nullable=True))
    op.add_column("reminder_logs", sa.Column("dismissed_by_id", sa.Integer, nullable=True))
    if _is_mysql():
        op.create_foreign_key(
            "fk_reminder_logs_dismissed_by", "reminder_logs", "users",
            ["dismissed_by_id"], ["id"], ondelete="SET NULL",
        )

    # Backfill: infer the triggering status from the old message text.
    op.execute(
        "UPDATE reminder_logs SET trigger_status = 'ACCEPTED' WHERE message LIKE '% in ACCEPTED status%'"
    )
    # The old scheduler wrote a new row every cycle for the same stale order. Keep the earliest row
    # per (order, status) so the unique constraint below can be created.
    op.execute(
        "DELETE FROM reminder_logs WHERE id NOT IN ("
        "SELECT keep_id FROM (SELECT MIN(id) AS keep_id FROM reminder_logs "
        "GROUP BY order_id, trigger_status) AS keepers)"
    )
    # Reminders whose order already moved on are history, not active.
    op.execute(
        "UPDATE reminder_logs SET status = 'RESOLVED', resolved_at = CURRENT_TIMESTAMP "
        "WHERE order_id IN (SELECT id FROM orders WHERE status NOT IN ('PLACED', 'ACCEPTED')) "
        "OR (trigger_status = 'PLACED' AND order_id IN (SELECT id FROM orders WHERE status = 'ACCEPTED')) "
        "OR (trigger_status = 'ACCEPTED' AND order_id IN (SELECT id FROM orders WHERE status = 'PLACED'))"
    )
    op.create_index(
        "uq_reminder_order_trigger", "reminder_logs", ["order_id", "trigger_status"], unique=True
    )
    op.create_index("ix_reminder_logs_status_created", "reminder_logs", ["status", "created_at"])

    # --- shared rate-limit counters and scheduler leases -----------------------------------
    op.create_table(
        "rate_limit_counters",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("bucket", sa.String(160), nullable=False),
        sa.Column("window_start", sa.DateTime, nullable=False),
        sa.Column("hits", sa.Integer, nullable=False, server_default=sa.text("0")),
        sa.UniqueConstraint("bucket", "window_start", name="uq_rate_limit_bucket_window"),
    )
    op.create_index("ix_rate_limit_counters_window_start", "rate_limit_counters", ["window_start"])
    op.create_table(
        "scheduler_leases",
        sa.Column("name", sa.String(64), primary_key=True),
        sa.Column("owner", sa.String(128), nullable=False),
        sa.Column("leased_until", sa.DateTime, nullable=False),
    )

    # --- indexes (new composites first so FK columns always keep a usable index) -----------
    op.create_index("ix_orders_status_updated_at", "orders", ["status", "updated_at"])
    op.create_index("ix_orders_restaurant_created", "orders", ["restaurant_id", "created_at"])
    op.create_index("ix_orders_customer_created", "orders", ["customer_id", "created_at"])
    _drop_index_if_exists("ix_orders_status", "orders")
    _drop_index_if_exists("ix_orders_restaurant_id", "orders")
    _drop_index_if_exists("ix_orders_customer_id", "orders")

    op.create_index("ix_reviews_restaurant_created", "reviews", ["restaurant_id", "created_at"])
    _drop_index_if_exists("ix_reviews_restaurant_id", "reviews")

    op.create_index(
        "ix_delivery_partner_assigned", "delivery_assignments", ["delivery_partner_id", "assigned_at"]
    )
    _drop_index_if_exists(
        "ix_delivery_assignments_partner_id", "delivery_assignments",
        ("ix_delivery_assignments_delivery_partner_id",),
    )


def downgrade() -> None:
    op.create_index("ix_delivery_assignments_partner_id", "delivery_assignments", ["delivery_partner_id"])
    op.drop_index("ix_delivery_partner_assigned", table_name="delivery_assignments")

    op.create_index("ix_reviews_restaurant_id", "reviews", ["restaurant_id"])
    op.drop_index("ix_reviews_restaurant_created", table_name="reviews")

    op.create_index("ix_orders_customer_id", "orders", ["customer_id"])
    op.create_index("ix_orders_restaurant_id", "orders", ["restaurant_id"])
    op.create_index("ix_orders_status", "orders", ["status"])
    op.drop_index("ix_orders_customer_created", table_name="orders")
    op.drop_index("ix_orders_restaurant_created", table_name="orders")
    op.drop_index("ix_orders_status_updated_at", table_name="orders")

    op.drop_table("scheduler_leases")
    op.drop_index("ix_rate_limit_counters_window_start", table_name="rate_limit_counters")
    op.drop_table("rate_limit_counters")

    op.drop_index("ix_reminder_logs_status_created", table_name="reminder_logs")
    op.drop_index("uq_reminder_order_trigger", table_name="reminder_logs")
    if _is_mysql():
        op.drop_constraint("fk_reminder_logs_dismissed_by", "reminder_logs", type_="foreignkey")
    for column in ("dismissed_by_id", "dismissed_at", "resolved_at", "status", "trigger_status"):
        op.drop_column("reminder_logs", column)

    op.drop_index("uq_payment_ledger_order_entry", table_name="payment_ledger")
    op.execute("DELETE FROM payment_ledger WHERE entry_type IN ('void', 'VOID')")
    if _is_mysql():
        for table, column, name, old_labels, new_labels, default in reversed(_ENUM_COLUMNS):
            _convert_enum(table, column, name, old_labels, new_labels, default, to_upper=False)

    op.drop_column("restaurants", "rating_sum")
    op.drop_column("users", "is_approved")
