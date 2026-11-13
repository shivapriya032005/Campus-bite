"""Scheduler wiring.

Development: the API starts a BackgroundScheduler in-process (SCHEDULER_ENABLED=true).
Production: run ``python -m app.scheduler`` as a single dedicated process and set
SCHEDULER_ENABLED=false for the API workers. Jobs are additionally guarded by a database lease,
so an accidental second scheduler cannot produce duplicate work.
"""

import logging

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.schedulers.blocking import BlockingScheduler

from app.core.config import settings
from app.tasks.reminders import check_stale_orders, purge_rate_limit_counters

logger = logging.getLogger("campusbite.scheduler")


def _register_jobs(scheduler) -> None:
    scheduler.add_job(
        check_stale_orders,
        "interval",
        minutes=max(settings.reminder_check_interval_minutes, 1),
        id="stale_order_check",
        max_instances=1,
        coalesce=True,
        replace_existing=True,
    )
    scheduler.add_job(
        purge_rate_limit_counters,
        "interval",
        hours=1,
        id="purge_rate_limits",
        max_instances=1,
        coalesce=True,
        replace_existing=True,
    )


def build_background_scheduler() -> BackgroundScheduler:
    scheduler = BackgroundScheduler()
    _register_jobs(scheduler)
    return scheduler


def main() -> None:  # pragma: no cover - process entrypoint
    logging.basicConfig(level=logging.INFO)
    scheduler = BlockingScheduler()
    _register_jobs(scheduler)
    logger.info("Dedicated scheduler started")
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        logger.info("Dedicated scheduler stopped")


if __name__ == "__main__":  # pragma: no cover
    main()
