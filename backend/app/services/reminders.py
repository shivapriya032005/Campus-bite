"""Stale-order reminder lifecycle shared by the scheduler and the manual API trigger.

Rules:
* PLACED / ACCEPTED orders not updated for ``reminder_threshold_minutes`` get one ACTIVE reminder
  per (order, stale status). A DB unique constraint makes concurrent runs idempotent.
* A reminder becomes RESOLVED when its order leaves the status that triggered it.
* Owners can DISMISS active reminders. Resolved/dismissed rows are kept as history and never
  regenerated for the same (order, status).
"""

from datetime import datetime, timedelta

from sqlalchemy import exists, select, update
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.timeutil import utcnow
from app.models.order import Order, OrderStatus
from app.models.reminder_log import ReminderLog, ReminderStatus

ELIGIBLE_STATUSES = (OrderStatus.PLACED, OrderStatus.ACCEPTED)


def _insert_ignore(db: Session, values: dict) -> bool:
    """Insert a reminder, silently skipping it if (order_id, trigger_status) already exists."""
    table = ReminderLog.__table__
    dialect = db.get_bind().dialect.name
    if dialect == "mysql":
        from sqlalchemy.dialects.mysql import insert as mysql_insert

        stmt = mysql_insert(table).values(**values).prefix_with("IGNORE")
    elif dialect == "sqlite":
        from sqlalchemy.dialects.sqlite import insert as sqlite_insert

        stmt = sqlite_insert(table).values(**values).on_conflict_do_nothing()
    else:  # pragma: no cover
        from sqlalchemy.dialects.postgresql import insert as pg_insert

        stmt = pg_insert(table).values(**values).on_conflict_do_nothing()
    return (db.execute(stmt).rowcount or 0) > 0


def resolve_reminders(db: Session, restaurant_id: int | None = None, now: datetime | None = None) -> int:
    """Mark ACTIVE reminders RESOLVED once their order has left the triggering status."""
    now = now or utcnow()
    resolved = 0
    for status in ELIGIBLE_STATUSES:
        query = (
            select(ReminderLog.id)
            .join(Order, Order.id == ReminderLog.order_id)
            .where(
                ReminderLog.status == ReminderStatus.ACTIVE,
                ReminderLog.trigger_status == status.value,
                Order.status != status,
            )
        )
        if restaurant_id is not None:
            query = query.where(Order.restaurant_id == restaurant_id)
        ids = list(db.execute(query.order_by(ReminderLog.id)).scalars())
        if ids:
            result = db.execute(
                update(ReminderLog)
                .where(ReminderLog.id.in_(ids), ReminderLog.status == ReminderStatus.ACTIVE)
                .values(status=ReminderStatus.RESOLVED, resolved_at=now)
            )
            resolved += result.rowcount or 0
    return resolved


def resolve_for_order(db: Session, order_id: int, new_status: OrderStatus, now: datetime | None = None) -> None:
    """Immediately resolve an order's active reminders after a status change (same transaction)."""
    db.execute(
        update(ReminderLog)
        .where(
            ReminderLog.order_id == order_id,
            ReminderLog.status == ReminderStatus.ACTIVE,
            ReminderLog.trigger_status != new_status.value,
        )
        .values(status=ReminderStatus.RESOLVED, resolved_at=now or utcnow())
    )


def sync_reminders(
    db: Session, restaurant_id: int | None = None, now: datetime | None = None
) -> list[ReminderLog]:
    """Resolve outdated reminders, then create missing ones. Returns the newly created reminders.

    Does not commit; the caller owns the transaction.
    """
    now = (now or utcnow()).replace(microsecond=0)  # DATETIME columns store whole seconds
    minutes = settings.reminder_threshold_minutes
    threshold = now - timedelta(minutes=minutes)
    resolve_reminders(db, restaurant_id, now)

    created_keys: list[tuple[int, str]] = []
    for status in ELIGIBLE_STATUSES:
        already_reminded = exists().where(
            ReminderLog.order_id == Order.id, ReminderLog.trigger_status == status.value
        )
        query = select(Order.id).where(
            Order.status == status, Order.updated_at <= threshold, ~already_reminded
        )
        if restaurant_id is not None:
            query = query.where(Order.restaurant_id == restaurant_id)
        # Deterministic order: concurrent runs then queue on each other instead of deadlocking.
        for order_id in db.execute(query.order_by(Order.id)).scalars().all():
            inserted = _insert_ignore(
                db,
                {
                    "order_id": order_id,
                    "message": f"Order #{order_id} has been in {status.value} status for over {minutes} minutes.",
                    "trigger_status": status.value,
                    "status": ReminderStatus.ACTIVE.value,
                    "created_at": now,
                },
            )
            if inserted:
                created_keys.append((order_id, status.value))

    if not created_keys:
        return []
    order_ids = sorted({order_id for order_id, _ in created_keys})
    wanted = set(created_keys)
    rows = db.execute(
        select(ReminderLog).where(ReminderLog.order_id.in_(order_ids), ReminderLog.created_at == now)
    ).scalars()
    return [r for r in rows if (r.order_id, r.trigger_status) in wanted]


def sync_reminders_and_commit(
    db: Session, restaurant_id: int | None = None, attempts: int = 3
) -> list[ReminderLog]:
    """``sync_reminders`` in its own transaction, retried if MySQL picks it as a deadlock victim."""
    for attempt in range(attempts):
        try:
            created = sync_reminders(db, restaurant_id=restaurant_id)
            db.commit()
            return created
        except OperationalError:
            db.rollback()
            if attempt == attempts - 1:
                raise
    return []  # pragma: no cover
