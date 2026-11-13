"""Background jobs run by the scheduler (see app.scheduler)."""

import logging
from datetime import timedelta

from app.core.config import settings
from app.db.session import SessionLocal
from app.services.rate_limit import purge_expired_counters
from app.services.reminders import sync_reminders_and_commit
from app.services.scheduler_lock import try_acquire_lease

logger = logging.getLogger("campusbite.tasks")

REMINDER_LEASE = "stale_order_reminders"


def check_stale_orders(session_factory=None) -> int | None:
    """Create/resolve stale-order reminders.

    Guarded by a database lease so that, even if several workers or instances run a scheduler,
    only one executes each cycle. Returns the number of reminders created, or None when skipped.
    """
    db = (session_factory or SessionLocal)()
    try:
        interval = max(settings.reminder_check_interval_minutes, 1)
        ttl = timedelta(seconds=max(interval * 60 - 30, 30))
        if not try_acquire_lease(db, REMINDER_LEASE, ttl):
            logger.debug("Reminder cycle skipped: lease held by another instance")
            return None
        created = sync_reminders_and_commit(db)
        if created:
            logger.info("Created %d stale-order reminders", len(created))
        return len(created)
    except Exception:
        logger.exception("Error in stale-order check")
        db.rollback()
        return None
    finally:
        db.close()


def purge_rate_limit_counters(session_factory=None) -> int:
    db = (session_factory or SessionLocal)()
    try:
        return purge_expired_counters(db)
    except Exception:
        logger.exception("Error purging rate-limit counters")
        db.rollback()
        return 0
    finally:
        db.close()
