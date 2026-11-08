"""Order endpoints — checkout, status transitions, history."""

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.core.security import get_current_user, require_role
from app.db.session import get_db
from app.models.menu_item import MenuItem
from app.models.order import Order, OrderStatus, VALID_TRANSITIONS
from app.models.order_item import OrderItem
from app.models.payment_ledger import PaymentEntryType, PaymentLedger, PaymentStatus
from app.models.restaurant import Restaurant
from app.models.user import User
from app.schemas.order import (
    CheckoutRequest,
    OrderListResponse,
    OrderResponse,
    OrderStatusUpdate,
)

router = APIRouter(prefix="/orders", tags=["Orders"])


# ---------------------------------------------------------------------------
# Customer — place order
# ---------------------------------------------------------------------------

@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def checkout(
    payload: CheckoutRequest,
    current_user: User = Depends(require_role("customer")),
    db: Session = Depends(get_db),
):
    """Place a new order (checkout).  Creates order, order items, and payment ledger entry."""
    restaurant = db.query(Restaurant).filter(
        Restaurant.id == payload.restaurant_id, Restaurant.is_active == True  # noqa: E712
    ).first()
    if not restaurant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restaurant not found or inactive")

    # Validate menu items
    menu_item_ids = [ci.menu_item_id for ci in payload.items]
    menu_items = (
        db.query(MenuItem)
        .filter(
            MenuItem.id.in_(menu_item_ids),
            MenuItem.restaurant_id == restaurant.id,
            MenuItem.is_available == True,  # noqa: E712
        )
        .all()
    )
    menu_map = {m.id: m for m in menu_items}

    if len(menu_map) != len(menu_item_ids):
        missing = set(menu_item_ids) - set(menu_map.keys())
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Menu items not found or unavailable: {missing}",
        )

    # Build order items with snapshot data
    order_items: list[OrderItem] = []
    total = Decimal("0.00")
    for ci in payload.items:
        mi = menu_map[ci.menu_item_id]
        subtotal = mi.price * ci.quantity
        total += subtotal
        order_items.append(
            OrderItem(
                menu_item_id=mi.id,
                item_name=mi.name,
                unit_price=mi.price,
                quantity=ci.quantity,
                subtotal=subtotal,
            )
        )

    order = Order(
        customer_id=current_user.id,
        restaurant_id=restaurant.id,
        status=OrderStatus.PLACED,
        total_amount=total,
        delivery_address=payload.delivery_address,
        special_instructions=payload.special_instructions,
        items=order_items,
    )
    db.add(order)
    db.flush()  # get order.id

    # Create payment ledger entry (dummy payment)
    payment = PaymentLedger(
        order_id=order.id,
        entry_type=PaymentEntryType.PAYMENT,
        amount=total,
        status=PaymentStatus.MOCK_PAID,
        reference_id=f"PAY-{uuid.uuid4().hex[:12].upper()}",
    )
    db.add(payment)
    db.commit()
    db.refresh(order)
    return OrderResponse.from_order(order)


# ---------------------------------------------------------------------------
# Customer — view own orders
# ---------------------------------------------------------------------------

@router.get("/my", response_model=OrderListResponse)
def list_my_orders(
    status_filter: str | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
    current_user: User = Depends(require_role("customer")),
    db: Session = Depends(get_db),
):
    """List orders placed by the current customer."""
    query = db.query(Order).filter(Order.customer_id == current_user.id)
    if status_filter:
        try:
            query = query.filter(Order.status == OrderStatus(status_filter))
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status filter")
    total = query.count()
    orders = (
        query.options(joinedload(Order.items))
        .order_by(Order.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    # Deduplicate due to joinedload
    seen = set()
    unique_orders = []
    for o in orders:
        if o.id not in seen:
            seen.add(o.id)
            unique_orders.append(o)
    return OrderListResponse(
        orders=[OrderResponse.from_order(o) for o in unique_orders],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get("/my/{order_id}", response_model=OrderResponse)
def get_my_order(
    order_id: int,
    current_user: User = Depends(require_role("customer")),
    db: Session = Depends(get_db),
):
    """Get a specific order belonging to the current customer."""
    order = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.id == order_id, Order.customer_id == current_user.id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return OrderResponse.from_order(order)


# ---------------------------------------------------------------------------
# Customer — cancel PLACED order
# ---------------------------------------------------------------------------

@router.post("/my/{order_id}/cancel", response_model=OrderResponse)
def cancel_order(
    order_id: int,
    current_user: User = Depends(require_role("customer")),
    db: Session = Depends(get_db),
):
    """Cancel a PLACED order."""
    order = db.query(Order).filter(
        Order.id == order_id, Order.customer_id == current_user.id
    ).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if order.status != OrderStatus.PLACED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel order in {order.status.value} status",
        )
    order.status = OrderStatus.CANCELLED
    db.commit()
    db.refresh(order)
    return OrderResponse.from_order(order)


# ---------------------------------------------------------------------------
# Restaurant owner — view / update orders
# ---------------------------------------------------------------------------

@router.get("/restaurant", response_model=OrderListResponse)
def list_restaurant_orders(
    status_filter: str | None = Query(None, alias="status"),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
    current_user: User = Depends(require_role("owner")),
    db: Session = Depends(get_db),
):
    """List orders for the owner's restaurant."""
    restaurant = db.query(Restaurant).filter(Restaurant.owner_id == current_user.id).first()
    if not restaurant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="You have no restaurant")

    query = db.query(Order).filter(Order.restaurant_id == restaurant.id)
    if status_filter:
        try:
            query = query.filter(Order.status == OrderStatus(status_filter))
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status filter")
    if date_from:
        query = query.filter(Order.created_at >= date_from)
    if date_to:
        query = query.filter(Order.created_at <= date_to)

    total = query.count()
    orders = (
        query.options(joinedload(Order.items))
        .order_by(Order.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    seen = set()
    unique_orders = []
    for o in orders:
        if o.id not in seen:
            seen.add(o.id)
            unique_orders.append(o)
    return OrderListResponse(
        orders=[OrderResponse.from_order(o) for o in unique_orders],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.patch("/{order_id}/status", response_model=OrderResponse)
def update_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    current_user: User = Depends(require_role("owner")),
    db: Session = Depends(get_db),
):
    """Update order status (owner transitions: PLACED→ACCEPTED→PREPARING→READY)."""
    restaurant = db.query(Restaurant).filter(Restaurant.owner_id == current_user.id).first()
    if not restaurant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="You have no restaurant")

    order = db.query(Order).filter(
        Order.id == order_id, Order.restaurant_id == restaurant.id
    ).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    try:
        new_status = OrderStatus(payload.status)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status value")

    allowed = VALID_TRANSITIONS.get(order.status, [])
    if new_status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition from {order.status.value} to {new_status.value}",
        )

    # Owners may only do: PLACED→ACCEPTED, ACCEPTED→PREPARING, PREPARING→READY
    owner_allowed = {
        OrderStatus.PLACED: [OrderStatus.ACCEPTED],
        OrderStatus.ACCEPTED: [OrderStatus.PREPARING],
        OrderStatus.PREPARING: [OrderStatus.READY],
    }
    if new_status not in owner_allowed.get(order.status, []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Owners cannot transition orders from {order.status.value} to {new_status.value}",
        )

    order.status = new_status
    db.commit()
    db.refresh(order)
    return OrderResponse.from_order(order)

