import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Index, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class DeliveryStatus(str, enum.Enum):
    ASSIGNED = "ASSIGNED"
    OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY"
    DELIVERED = "DELIVERED"


class DeliveryAssignment(Base):
    __tablename__ = "delivery_assignments"
    __table_args__ = (Index("ix_delivery_partner_assigned", "delivery_partner_id", "assigned_at"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    order_id: Mapped[int] = mapped_column(
        ForeignKey("orders.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    delivery_partner_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[DeliveryStatus] = mapped_column(
        SAEnum(DeliveryStatus), default=DeliveryStatus.ASSIGNED, nullable=False
    )
    assigned_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    picked_up_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    delivered_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # ---- relationships ----
    order: Mapped["Order"] = relationship("Order", back_populates="delivery_assignment")
    delivery_partner: Mapped["User"] = relationship("User", back_populates="delivery_assignments")

    def __repr__(self) -> str:
        return f"<DeliveryAssignment id={self.id} order_id={self.order_id} status={self.status.value}>"

