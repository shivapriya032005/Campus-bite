"""Order endpoints — checkout, status transitions, history."""

import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.security import require_role
from app.db.session import get_db
from app.models.menu_item import MenuItem
from app.models.order import Order, OrderStatus, VALID_TRANSITIONS
from app.models.order_item import OrderItem
from app.models.payment_ledger import PaymentEntryType, PaymentLedger, PaymentStatus
from app.models.restaurant import Restaurant
from app.models.user import User
from app.schemas.order import (
    MAX_QUANTITY_PER_ITEM,
    CheckoutRequest,
    OrderListResponse,
    OrderResponse,
    OrderStatusUpdate,
)
from app.services.date_filters import DateOrDateTime, resolve_range
from app.services.reminders import resolve_for_order

router = APIRouter(prefix="/orders", tags=["Orders"])

_MONEY = Decimal("0.01")

# Eager-load everything OrderResponse needs so list endpoints run a constant number of queries.
_ORDER_LOAD = (selectinload(Order.items), selectinload(Order.payment_entries))


def _owner_restaurant(owner: User, db: Session) -> Restaurant:
    restaurant = db.query(Restaurant).filter(Restaurant.owner_id == owner.id).first()
    if not restaurant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="You have no restaurant")
    return restaurant


ACTIVE_STATUSES = [
    OrderStatus.PLACED, OrderStatus.ACCEPTED, OrderStatus.PREPARING,
    OrderStatus.READY, OrderStatus.ASSIGNED, OrderStatus.OUT_FOR_DELIVERY,
]


def _parse_status_filter(value: str | None) -> list[OrderStatus]:
    """Parse ``status``: one status, a comma-separated list, or ``ACTIVE`` (all in-flight statuses)."""
    if not value:
        return []
    wanted: list[OrderStatus] = []
    for part in value.split(","):
        part = part.strip().upper()
        if not part:
            continue
        if part == "ACTIVE":
            wanted.extend(ACTIVE_STATUSES)
            continue
        try:
            wanted.append(OrderStatus(part))
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status filter")
    return wanted


def _paginate(query, page: int, per_page: int, order_by):
    total = query.order_by(None).with_entities(func.count(Order.id)).scalar() or 0
    orders = (
        query.options(*_ORDER_LOAD)
        .order_by(*order_by)
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return total, orders


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

    # Merge duplicate cart lines (same dish added twice) into one line with the combined quantity.
    quantities: dict[int, int] = {}
    for line in payload.items:
        quantities[line.menu_item_id] = quantities.get(line.menu_item_id, 0) + line.quantity

    too_many = [mid for mid, qty in quantities.items() if qty > MAX_QUANTITY_PER_ITEM]
    if too_many:
        raise HTTPException(
            status_code=422,
            detail=f"At most {MAX_QUANTITY_PER_ITEM} of a single item can be ordered (item ids: {sorted(too_many)})",
        )

    # Prices and availability always come from the database, never from the client.
    menu_items = (
        db.query(MenuItem)
        .filter(MenuItem.id.in_(quantities.keys()), MenuItem.restaurant_id == restaurant.id)
        .all()
    )
    menu_map = {m.id: m for m in menu_items}

    missing = sorted(set(quantities) - set(menu_map))
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Menu items not found for this restaurant: {missing}",
        )
    unavailable = [menu_map[mid].name for mid in quantities if not menu_map[mid].is_available]
    if unavailable:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Items currently unavailable: {', '.join(unavailable)}",
        )

    order_items: list[OrderItem] = []
    total = Decimal("0.00")
    for menu_item_id, quantity in quantities.items():
        mi = menu_map[menu_item_id]
        unit_price = Decimal(mi.price).quantize(_MONEY)
        subtotal = (unit_price * quantity).quantize(_MONEY)
        total += subtotal
        order_items.append(
            OrderItem(
                menu_item_id=mi.id,
                item_name=mi.name,
                unit_price=unit_price,
                quantity=quantity,
                subtotal=subtotal,
            )
        )

    # Order, items and the dummy payment ledger entry are committed atomically.
    order = Order(
        customer_id=current_user.id,
        restaurant_id=restaurant.id,
        status=OrderStatus.PLACED,
        total_amount=total,
        delivery_address=payload.delivery_address,
        special_instructions=payload.special_instructions,
        items=order_items,
        payment_entries=[
            PaymentLedger(
                entry_type=PaymentEntryType.PAYMENT,
                amount=total,
                status=PaymentStatus.MOCK_PAID,
                reference_id=f"PAY-{uuid.uuid4().hex[:12].upper()}",
            )
        ],
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return OrderResponse.from_order(order)


# ---------------------------------------------------------------------------
# Customer — view own orders
# ---------------------------------------------------------------------------

@router.get("/my", response_model=OrderListResponse)
def list_my_orders(
    status_filter: str | None = Query(None, alias="status"),
    date_from: DateOrDateTime | None = Query(None, description="YYYY-MM-DD or ISO-8601 datetime"),
    date_to: DateOrDateTime | None = Query(None, description="YYYY-MM-DD (whole day) or ISO-8601 datetime"),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
    current_user: User = Depends(require_role("customer")),
    db: Session = Depends(get_db),
):
    """List orders placed by the current customer."""
    wanted = _parse_status_filter(status_filter)
    start, end = resolve_range(date_from, date_to)

    query = db.query(Order).filter(Order.customer_id == current_user.id)
    if wanted:
        query = query.filter(Order.status.in_(wanted))
    if start:
        query = query.filter(Order.created_at >= start)
    if end:
        query = query.filter(Order.created_at < end)

    total, orders = _paginate(query, page, per_page, (Order.created_at.desc(), Order.id.desc()))
    return OrderListResponse(
        orders=[OrderResponse.from_order(o) for o in orders],
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
        .options(*_ORDER_LOAD)
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
    """Cancel a PLACED order.

    The original ``mock_paid`` ledger entry is preserved and a separate ``voided`` entry is added.
    The status change is a compare-and-set (``WHERE status = 'PLACED'``) so it cannot race with the
    restaurant accepting the order, and the whole operation commits atomically.
    """
    order = (
        db.query(Order)
        .options(*_ORDER_LOAD)
        .filter(Order.id == order_id, Order.customer_id == current_user.id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if order.status != OrderStatus.PLACED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel order in {order.status.value} status",
        )

    try:
        result = db.execute(
            update(Order)
            .where(Order.id == order.id, Order.status == OrderStatus.PLACED)
            .values(status=OrderStatus.CANCELLED)
            .execution_options(synchronize_session=False)
        )
        if (result.rowcount or 0) != 1:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="The order was updated by the restaurant and can no longer be cancelled",
            )
        db.add(
            PaymentLedger(
                order_id=order.id,
                entry_type=PaymentEntryType.VOID,
                amount=order.total_amount,
                status=PaymentStatus.VOIDED,
                reference_id=f"VOID-{uuid.uuid4().hex[:12].upper()}",
            )
        )
        resolve_for_order(db, order.id, OrderStatus.CANCELLED)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Order is already cancelled")

    db.expire(order)
    order = (
        db.query(Order).options(*_ORDER_LOAD).filter(Order.id == order_id).populate_existing().one()
    )
    return OrderResponse.from_order(order)


# ---------------------------------------------------------------------------
# Restaurant owner — view / update orders
# ---------------------------------------------------------------------------

@router.get("/restaurant", response_model=OrderListResponse)
def list_restaurant_orders(
    status_filter: str | None = Query(None, alias="status"),
    date_from: DateOrDateTime | None = Query(None, description="YYYY-MM-DD or ISO-8601 datetime"),
    date_to: DateOrDateTime | None = Query(None, description="YYYY-MM-DD (whole day) or ISO-8601 datetime"),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
    current_user: User = Depends(require_role("owner")),
    db: Session = Depends(get_db),
):
    """List orders for the owner's restaurant."""
    restaurant = _owner_restaurant(current_user, db)
    wanted = _parse_status_filter(status_filter)
    start, end = resolve_range(date_from, date_to)

    query = db.query(Order).filter(Order.restaurant_id == restaurant.id)
    if wanted:
        query = query.filter(Order.status.in_(wanted))
    if start:
        query = query.filter(Order.created_at >= start)
    if end:
        query = query.filter(Order.created_at < end)

    total, orders = _paginate(query, page, per_page, (Order.created_at.desc(), Order.id.desc()))
    return OrderListResponse(
        orders=[OrderResponse.from_order(o) for o in orders],
        total=total,
        page=page,
        per_page=per_page,
    )


# Owners may only do: PLACED→ACCEPTED, ACCEPTED→PREPARING, PREPARING→READY
_OWNER_ALLOWED = {
    OrderStatus.PLACED: [OrderStatus.ACCEPTED],
    OrderStatus.ACCEPTED: [OrderStatus.PREPARING],
    OrderStatus.PREPARING: [OrderStatus.READY],
}


@router.patch("/{order_id}/status", response_model=OrderResponse)
def update_order_status(
    order_id: int,
    payload: OrderStatusUpdate,
    current_user: User = Depends(require_role("owner")),
    db: Session = Depends(get_db),
):
    """Update order status (owner transitions: PLACED→ACCEPTED→PREPARING→READY)."""
    restaurant = _owner_restaurant(current_user, db)

    order = db.query(Order).filter(
        Order.id == order_id, Order.restaurant_id == restaurant.id
    ).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    try:
        new_status = OrderStatus(payload.status)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status value")

    current = order.status
    if new_status not in VALID_TRANSITIONS.get(current, []):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition from {current.value} to {new_status.value}",
        )
    if new_status not in _OWNER_ALLOWED.get(current, []):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Owners cannot transition orders from {current.value} to {new_status.value}",
        )

    # Compare-and-set: fails if the customer cancelled (or anything else moved the order) meanwhile.
    result = db.execute(
        update(Order)
        .where(Order.id == order.id, Order.status == current)
        .values(status=new_status)
        .execution_options(synchronize_session=False)
    )
    if (result.rowcount or 0) != 1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The order status changed in the meantime. Refresh and try again.",
        )
    resolve_for_order(db, order.id, new_status)
    db.commit()

    order = db.query(Order).options(*_ORDER_LOAD).filter(Order.id == order_id).populate_existing().one()
    return OrderResponse.from_order(order)
