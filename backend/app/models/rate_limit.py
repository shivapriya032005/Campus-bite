from datetime import datetime

from sqlalchemy import DateTime, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class RateLimitCounter(Base):
    """Fixed-window request counters shared by every API worker (see app.services.rate_limit)."""

    __tablename__ = "rate_limit_counters"
    __table_args__ = (UniqueConstraint("bucket", "window_start", name="uq_rate_limit_bucket_window"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    bucket: Mapped[str] = mapped_column(String(160), nullable=False)
    window_start: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    hits: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class SchedulerLease(Base):
    """Lease row so a periodic job runs on one instance at a time (see app.services.scheduler_lock)."""

    __tablename__ = "scheduler_leases"

    name: Mapped[str] = mapped_column(String(64), primary_key=True)
    owner: Mapped[str] = mapped_column(String(128), nullable=False)
    leased_until: Mapped[datetime] = mapped_column(DateTime, nullable=False)
