"""Pydantic schemas for orders, cart, payments, reviews, refunds, deliveries."""

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Cart / Checkout
# ---------------------------------------------------------------------------

class CartItem(BaseModel):
    menu_item_id: int
    quantity: int = Field(..., ge=1)


class CheckoutRequest(BaseModel):
    restaurant_id: int
    items: list[CartItem] = Field(..., min_length=1)
    delivery_address: str = Field(..., min_length=1, max_length=500)
    special_instructions: str | None = None


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


class OrderResponse(BaseModel):
    id: int
    customer_id: int
    restaurant_id: int
    status: str
    total_amount: Decimal
    delivery_address: str
    special_instructions: str | None
    items: list[OrderItemResponse] = []
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
            created_at=order.created_at,
            updated_at=order.updated_at,
        )


class OrderListResponse(BaseModel):
    orders: list[OrderResponse]
    total: int
    page: int
    per_page: int


class OrderStatusUpdate(BaseModel):
    status: str


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
    comment: str | None = None


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
    reason: str = Field(..., min_length=1)


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
    created_at: datetime

    model_config = {"from_attributes": True}


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

