import enum
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class PaymentEntryType(str, enum.Enum):
    PAYMENT = "payment"
    REFUND = "refund"
    VOID = "void"


class PaymentStatus(str, enum.Enum):
    MOCK_PAID = "mock_paid"
    REFUNDED = "refunded"
    VOIDED = "voided"


class PaymentLedger(Base):
    __tablename__ = "payment_ledger"
    # An order can be paid, voided and refunded at most once each.
    __table_args__ = (UniqueConstraint("order_id", "entry_type", name="uq_payment_ledger_order_entry"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(
        ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    entry_type: Mapped[PaymentEntryType] = mapped_column(SAEnum(PaymentEntryType), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    status: Mapped[PaymentStatus] = mapped_column(SAEnum(PaymentStatus), nullable=False)
    reference_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # ---- relationships ----
    order: Mapped["Order"] = relationship("Order", back_populates="payment_entries")

    def __repr__(self) -> str:
        return f"<PaymentLedger id={self.id} type={self.entry_type.value} amount={self.amount}>"

