"""Fixed-window rate limiting backed by the database.

Counters live in ``rate_limit_counters`` and are updated with a single atomic upsert, so the limits
hold across any number of API workers or instances without needing Redis.
"""

import math
from datetime import datetime, timedelta

from fastapi import HTTPException, Request, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.timeutil import utcnow
from app.models.rate_limit import RateLimitCounter

_EPOCH = datetime(1970, 1, 1)


def client_ip(request: Request) -> str:
    """Best-effort client IP. X-Forwarded-For is honoured only when TRUST_PROXY_HEADERS is on."""
    if settings.trust_proxy_headers:
        forwarded = request.headers.get("x-forwarded-for", "")
        first = forwarded.split(",")[0].strip()
        if first:
            return first[:64]
    return (request.client.host if request.client else "unknown")[:64]


def _upsert_hit(db: Session, bucket: str, window_start: datetime) -> None:
    dialect = db.get_bind().dialect.name
    values = {"bucket": bucket, "window_start": window_start, "hits": 1}
    table = RateLimitCounter.__table__
    if dialect == "mysql":
        from sqlalchemy.dialects.mysql import insert as mysql_insert

        stmt = mysql_insert(table).values(**values)
        stmt = stmt.on_duplicate_key_update(hits=table.c.hits + 1)
    elif dialect == "sqlite":
        from sqlalchemy.dialects.sqlite import insert as sqlite_insert

        stmt = sqlite_insert(table).values(**values)
        stmt = stmt.on_conflict_do_update(
            index_elements=["bucket", "window_start"], set_={"hits": table.c.hits + 1}
        )
    elif dialect == "postgresql":
        from sqlalchemy.dialects.postgresql import insert as pg_insert

        stmt = pg_insert(table).values(**values)
        stmt = stmt.on_conflict_do_update(
            index_elements=["bucket", "window_start"], set_={"hits": table.c.hits + 1}
        )
    else:  # pragma: no cover
        raise RuntimeError(f"Rate limiting is not supported on dialect {dialect!r}")
    db.execute(stmt)


def enforce_rate_limit(db: Session, bucket: str, max_hits: int, window_seconds: int) -> None:
    """Count one hit against ``bucket``; raise HTTP 429 once ``max_hits`` per window is exceeded.

    The counter is committed immediately so rejected/failed requests still count.
    """
    if max_hits <= 0 or window_seconds <= 0:
        return  # limit disabled
    now = utcnow()
    elapsed = int((now - _EPOCH).total_seconds())
    window_start = _EPOCH + timedelta(seconds=elapsed - elapsed % window_seconds)
    _upsert_hit(db, bucket, window_start)
    hits = db.execute(
        select(RateLimitCounter.hits).where(
            RateLimitCounter.bucket == bucket, RateLimitCounter.window_start == window_start
        )
    ).scalar_one()
    db.commit()
    if hits > max_hits:
        retry_after = max(1, math.ceil((window_start + timedelta(seconds=window_seconds) - now).total_seconds()))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please try again later.",
            headers={"Retry-After": str(retry_after)},
        )


def purge_expired_counters(db: Session, older_than: timedelta = timedelta(days=2)) -> int:
    result = db.execute(delete(RateLimitCounter).where(RateLimitCounter.window_start < utcnow() - older_than))
    db.commit()
    return result.rowcount or 0
