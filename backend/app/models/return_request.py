import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ReturnRequestStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class ReturnRequest(Base):
    __tablename__ = "return_requests"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(
        ForeignKey("orders.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    customer_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[ReturnRequestStatus] = mapped_column(
        SAEnum(ReturnRequestStatus), default=ReturnRequestStatus.PENDING, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # ---- relationships ----
    order: Mapped["Order"] = relationship("Order", back_populates="return_request")
    customer: Mapped["User"] = relationship("User", back_populates="return_requests")
    refund_record: Mapped["RefundRecord | None"] = relationship(
        "RefundRecord", back_populates="return_request", uselist=False
    )

    def __repr__(self) -> str:
        return f"<ReturnRequest id={self.id} order_id={self.order_id} status={self.status.value}>"

