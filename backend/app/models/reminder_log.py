import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Index, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ReminderStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"        # order still stale in the triggering status
    RESOLVED = "RESOLVED"    # order moved on (or was cancelled)
    DISMISSED = "DISMISSED"  # owner acknowledged the reminder


class ReminderLog(Base):
    __tablename__ = "reminder_logs"
    __table_args__ = (
        # At most one reminder per order per stale status: makes the scheduler and the manual
        # API trigger idempotent, and keeps resolved/dismissed rows as history.
        UniqueConstraint("order_id", "trigger_status", name="uq_reminder_order_trigger"),
        Index("ix_reminder_logs_status_created", "status", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(
        ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    message: Mapped[str] = mapped_column(String(500), nullable=False)
    trigger_status: Mapped[str] = mapped_column(String(20), nullable=False, default="PLACED", server_default="PLACED")
    status: Mapped[ReminderStatus] = mapped_column(
        SAEnum(ReminderStatus), nullable=False, default=ReminderStatus.ACTIVE, server_default="ACTIVE"
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    dismissed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    dismissed_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # ---- relationships ----
    order: Mapped["Order"] = relationship("Order", back_populates="reminders")

    def __repr__(self) -> str:
        return f"<ReminderLog id={self.id} order_id={self.order_id} status={self.status.value}>"
