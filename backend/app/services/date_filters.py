"""Validation of date / datetime range filters shared by order list endpoints."""

from datetime import date, datetime, time, timedelta
from typing import Annotated

from fastapi import HTTPException, status
from pydantic import Field

from app.core.timeutil import to_naive_utc

# "2024-05-01" parses as a date; anything with a time component parses as a datetime.
DateOrDateTime = Annotated[date | datetime, Field(union_mode="left_to_right")]


def resolve_range(
    date_from: date | datetime | None, date_to: date | datetime | None
) -> tuple[datetime | None, datetime | None]:
    """Return ``(start_inclusive, end_exclusive)`` as naive UTC datetimes.

    * A plain date means the whole UTC day (``date_to`` therefore includes that entire day).
    * A datetime with an offset is converted to UTC; a naive datetime is treated as UTC.
    * ``date_from`` later than ``date_to`` is rejected with HTTP 422.
    """
    start = _lower_bound(date_from)
    end = _upper_bound(date_to)
    if start is not None and end is not None and start >= end:
        raise HTTPException(
            status_code=422,
            detail="date_from must not be later than date_to",
        )
    return start, end


def _lower_bound(value: date | datetime | None) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return to_naive_utc(value)
    return datetime.combine(value, time.min)


def _upper_bound(value: date | datetime | None) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        # inclusive datetime -> exclusive bound one microsecond later
        return to_naive_utc(value) + timedelta(microseconds=1)
    return datetime.combine(value, time.min) + timedelta(days=1)
