"""Database lease so a periodic job runs on one instance at a time, whatever the worker count."""

import os
import socket
import uuid
from datetime import timedelta

from sqlalchemy import update
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.core.timeutil import utcnow
from app.models.rate_limit import SchedulerLease

INSTANCE_ID = f"{socket.gethostname()}:{os.getpid()}:{uuid.uuid4().hex[:8]}"
_MAX_ATTEMPTS = 3


def _ensure_row(db: Session, name: str) -> None:
    """Create the lease row (already expired) if it does not exist yet. Never overwrites."""
    table = SchedulerLease.__table__
    values = {"name": name, "owner": "", "leased_until": utcnow() - timedelta(seconds=1)}
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
    db.execute(stmt)
    db.commit()


def try_acquire_lease(db: Session, name: str, ttl: timedelta, owner: str = INSTANCE_ID) -> bool:
    """Atomically take (or renew) the lease ``name``. Returns False if another owner holds it.

    The row is created first and then taken with a single-row compare-and-set UPDATE, so
    concurrent callers serialize on the row lock (no gap-lock deadlocks) and exactly one wins.
    """
    for attempt in range(_MAX_ATTEMPTS):
        try:
            _ensure_row(db, name)
            now = utcnow()
            result = db.execute(
                update(SchedulerLease)
                .where(
                    SchedulerLease.name == name,
                    (SchedulerLease.leased_until < now) | (SchedulerLease.owner == owner),
                )
                .values(owner=owner, leased_until=now + ttl)
            )
            acquired = (result.rowcount or 0) > 0
            db.commit()
            return acquired
        except OperationalError:  # e.g. deadlock victim / lock wait timeout: retry, then give up
            db.rollback()
            if attempt == _MAX_ATTEMPTS - 1:
                raise  # surfaced (and logged) by the job wrapper instead of silently skipping
    return False  # pragma: no cover


def release_lease(db: Session, name: str, owner: str = INSTANCE_ID) -> None:
    db.execute(
        update(SchedulerLease)
        .where(SchedulerLease.name == name, SchedulerLease.owner == owner)
        .values(leased_until=utcnow() - timedelta(seconds=1))
    )
    db.commit()
