import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum as SAEnum, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class UserRole(str, enum.Enum):
    CUSTOMER = "customer"
    OWNER = "owner"
    DELIVERY = "delivery"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # ---- relationships ----
    restaurant: Mapped["Restaurant | None"] = relationship(
        "Restaurant", back_populates="owner", uselist=False
    )
    orders: Mapped[list["Order"]] = relationship(
        "Order", back_populates="customer", foreign_keys="Order.customer_id"
    )
    reviews: Mapped[list["Review"]] = relationship("Review", back_populates="customer")
    delivery_assignments: Mapped[list["DeliveryAssignment"]] = relationship(
        "DeliveryAssignment", back_populates="delivery_partner"
    )
    return_requests: Mapped[list["ReturnRequest"]] = relationship(
        "ReturnRequest", back_populates="customer"
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r} role={self.role.value}>"

