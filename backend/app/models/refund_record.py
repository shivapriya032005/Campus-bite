from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class RefundRecord(Base):
    __tablename__ = "refund_records"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(
        ForeignKey("orders.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    return_request_id: Mapped[int] = mapped_column(
        ForeignKey("return_requests.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # ---- relationships ----
    order: Mapped["Order"] = relationship("Order", back_populates="refund_record")
    return_request: Mapped["ReturnRequest"] = relationship(
        "ReturnRequest", back_populates="refund_record"
    )

    def __repr__(self) -> str:
        return f"<RefundRecord id={self.id} order_id={self.order_id} amount={self.amount}>"

