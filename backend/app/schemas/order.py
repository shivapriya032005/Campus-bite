"""Pydantic schemas for orders, cart, payments, reviews, refunds, deliveries."""

from datetime import datetime
from decimal import Decimal

from typing import Literal

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Cart / Checkout
# ---------------------------------------------------------------------------

MAX_QUANTITY_PER_ITEM = 50


class CartItem(BaseModel):
    menu_item_id: int = Field(..., ge=1)
    quantity: int = Field(..., ge=1, le=MAX_QUANTITY_PER_ITEM)


class CheckoutRequest(BaseModel):
    restaurant_id: int = Field(..., ge=1)
    items: list[CartItem] = Field(..., min_length=1, max_length=100)
    delivery_address: str = Field(..., min_length=1, max_length=500)
    special_instructions: str | None = Field(None, max_length=500)

    @field_validator("delivery_address")
    @classmethod
    def _address_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Delivery address must not be blank")
        return value

    @field_validator("special_instructions")
    @classmethod
    def _blank_instructions_to_none(cls, value: str | None) -> str | None:
        return value.strip() or None if value is not None else None


# ---------------------------------------------------------------------------
# Order responses
# ---------------------------------------------------------------------------

class OrderItemResponse(BaseModel):
    id: int
    menu_item_id: int | None
    item_name: str
    unit_price: Decimal
    quantity: int
    subtotal: Decimal

    model_config = {"from_attributes": True}


def _payment_status(order) -> str | None:
    """Latest meaningful ledger state: voided > refunded > mock_paid."""
    entries = {e.status.value for e in order.payment_entries}
    for state in ("voided", "refunded", "mock_paid"):
        if state in entries:
            return state
    return None


class OrderResponse(BaseModel):
    id: int
    customer_id: int
    restaurant_id: int
    status: str
    total_amount: Decimal
    delivery_address: str
    special_instructions: str | None
    items: list[OrderItemResponse] = []
    payment_status: str | None = None  # mock_paid | voided | refunded (from the payment ledger)
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_order(cls, order) -> "OrderResponse":
        return cls(
            id=order.id,
            customer_id=order.customer_id,
            restaurant_id=order.restaurant_id,
            status=order.status.value,
            total_amount=order.total_amount,
            delivery_address=order.delivery_address,
            special_instructions=order.special_instructions,
            items=[OrderItemResponse.model_validate(i) for i in order.items],
            payment_status=_payment_status(order),
            created_at=order.created_at,
            updated_at=order.updated_at,
        )


class OrderListResponse(BaseModel):
    orders: list[OrderResponse]
    total: int
    page: int
    per_page: int


class OrderStatusUpdate(BaseModel):
    status: str = Field(..., min_length=1, max_length=32)


class DeliveryStatusUpdate(BaseModel):
    status: Literal["OUT_FOR_DELIVERY", "DELIVERED"]


# ---------------------------------------------------------------------------
# Delivery assignment
# ---------------------------------------------------------------------------

class DeliveryAssignRequest(BaseModel):
    delivery_partner_id: int


class DeliveryAssignmentResponse(BaseModel):
    id: int
    order_id: int
    delivery_partner_id: int
    status: str
    assigned_at: datetime
    picked_up_at: datetime | None
    delivered_at: datetime | None

    model_config = {"from_attributes": True}

    @classmethod
    def from_assignment(cls, a) -> "DeliveryAssignmentResponse":
        return cls(
            id=a.id,
            order_id=a.order_id,
            delivery_partner_id=a.delivery_partner_id,
            status=a.status.value,
            assigned_at=a.assigned_at,
            picked_up_at=a.picked_up_at,
            delivered_at=a.delivered_at,
        )


# ---------------------------------------------------------------------------
# Reviews
# ---------------------------------------------------------------------------

class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: str | None = Field(None, max_length=1000)


class ReviewResponse(BaseModel):
    id: int
    order_id: int
    customer_id: int
    restaurant_id: int
    rating: int
    comment: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Return / Refund
# ---------------------------------------------------------------------------

class ReturnRequestCreate(BaseModel):
    reason: str = Field(..., min_length=1, max_length=1000)

    @field_validator("reason")
    @classmethod
    def _reason_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("A reason is required")
        return value


class ReturnRequestResponse(BaseModel):
    id: int
    order_id: int
    customer_id: int
    reason: str
    status: str
    created_at: datetime
    resolved_at: datetime | None

    model_config = {"from_attributes": True}

    @classmethod
    def from_request(cls, rr) -> "ReturnRequestResponse":
        return cls(
            id=rr.id,
            order_id=rr.order_id,
            customer_id=rr.customer_id,
            reason=rr.reason,
            status=rr.status.value,
            created_at=rr.created_at,
            resolved_at=rr.resolved_at,
        )


class RefundAction(BaseModel):
    action: str = Field(..., pattern="^(approve|reject)$")


class RefundRecordResponse(BaseModel):
    id: int
    order_id: int
    return_request_id: int
    amount: Decimal
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Payment
# ---------------------------------------------------------------------------

class PaymentLedgerResponse(BaseModel):
    id: int
    order_id: int
    entry_type: str
    amount: Decimal
    status: str
    reference_id: str
    created_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_entry(cls, e) -> "PaymentLedgerResponse":
        return cls(
            id=e.id,
            order_id=e.order_id,
            entry_type=e.entry_type.value,
            amount=e.amount,
            status=e.status.value,
            reference_id=e.reference_id,
            created_at=e.created_at,
        )


# ---------------------------------------------------------------------------
# Reminder
# ---------------------------------------------------------------------------

class ReminderResponse(BaseModel):
    id: int
    order_id: int
    message: str
    status: str = "ACTIVE"          # ACTIVE | RESOLVED | DISMISSED
    trigger_status: str = "PLACED"  # order status that was stale
    created_at: datetime
    resolved_at: datetime | None = None
    dismissed_at: datetime | None = None

    model_config = {"from_attributes": True}

    @field_validator("status", mode="before")
    @classmethod
    def _enum_value(cls, value):
        return getattr(value, "value", value)


# ---------------------------------------------------------------------------
# AI Insights
# ---------------------------------------------------------------------------

class InsightRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000)


class InsightResponse(BaseModel):
    answer: str


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

class DashboardStats(BaseModel):
    total_orders: int = 0
    pending_orders: int = 0
    active_orders: int = 0
    completed_orders: int = 0
    total_revenue: Decimal = Decimal("0.00")
    total_menu_items: int = 0
    avg_rating: Decimal = Decimal("0.00")
    total_reviews: int = 0

