"""Background task: generate reminders for stale orders every 5 minutes."""

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.order import Order, OrderStatus
from app.models.reminder_log import ReminderLog

logger = logging.getLogger("campusbite.tasks")


def check_stale_orders() -> None:
    """Find PLACED/ACCEPTED orders not updated for >15 min and create reminders."""
    db: Session = SessionLocal()
    try:
        threshold = datetime.now(timezone.utc) - timedelta(minutes=15)

        stale_orders = (
            db.query(Order)
            .filter(
                Order.status.in_([OrderStatus.PLACED, OrderStatus.ACCEPTED]),
                Order.updated_at <= threshold,
            )
            .all()
        )

        created = 0
        for order in stale_orders:
            # Skip if already reminded within the last 15 minutes
            recent = (
                db.query(ReminderLog)
                .filter(
                    ReminderLog.order_id == order.id,
                    ReminderLog.created_at >= threshold,
                )
                .first()
            )
            if recent:
                continue

            reminder = ReminderLog(
                order_id=order.id,
                message=f"Order #{order.id} has been in {order.status.value} status for over 15 minutes.",
            )
            db.add(reminder)
            created += 1

        if created:
            db.commit()
            logger.info("Created %d stale-order reminders", created)
    except Exception:
        logger.exception("Error in stale-order check")
        db.rollback()
    finally:
        db.close()

