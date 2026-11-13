"""Time helpers. The database stores naive UTC datetimes, so all comparisons use naive UTC."""

from datetime import datetime, timezone


def utcnow() -> datetime:
    """Current time as a naive UTC datetime (matches DateTime columns without tz)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def to_naive_utc(value: datetime) -> datetime:
    """Convert an aware datetime to naive UTC; naive values are assumed to already be UTC."""
    if value.tzinfo is not None:
        return value.astimezone(timezone.utc).replace(tzinfo=None)
    return value
