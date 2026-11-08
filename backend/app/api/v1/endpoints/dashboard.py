"""Dashboard and reminder endpoints."""

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import require_role
from app.db.session import get_db
from app.models.order import Order, OrderStatus
from app.models.reminder_log import ReminderLog
from app.models.restaurant import Restaurant
from app.models.user import User
from app.schemas.order import DashboardStats, ReminderResponse

router = APIRouter(tags=["Dashboard & Reminders"])


@router.get("/dashboard/stats", response_model=DashboardStats)
def get_dashboard_stats(
    current_user: User = Depends(require_role("owner")),
    db: Session = Depends(get_db),
):
    """Return aggregate statistics for the owner's restaurant."""
    restaurant = db.query(Restaurant).filter(Restaurant.owner_id == current_user.id).first()
    if not restaurant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No restaurant found")

    rid = restaurant.id
    total = db.query(func.count(Order.id)).filter(Order.restaurant_id == rid).scalar() or 0
    pending = (
        db.query(func.count(Order.id))
        .filter(Order.restaurant_id == rid, Order.status.in_([OrderStatus.PLACED, OrderStatus.ACCEPTED]))
        .scalar() or 0
    )
    active = (
        db.query(func.count(Order.id))
        .filter(
            Order.restaurant_id == rid,
            Order.status.in_([
                OrderStatus.PREPARING, OrderStatus.READY,
                OrderStatus.ASSIGNED, OrderStatus.OUT_FOR_DELIVERY,
            ]),
        )
        .scalar() or 0
    )
    completed = (
        db.query(func.count(Order.id))
        .filter(Order.restaurant_id == rid, Order.status == OrderStatus.DELIVERED)
        .scalar() or 0
    )
    revenue = (
        db.query(func.sum(Order.total_amount))
        .filter(
            Order.restaurant_id == rid,
            Order.status.in_([OrderStatus.DELIVERED, OrderStatus.REFUNDED]),
        )
        .scalar() or Decimal("0.00")
    )
    from app.models.menu_item import MenuItem
    menu_count = db.query(func.count(MenuItem.id)).filter(MenuItem.restaurant_id == rid).scalar() or 0

    return DashboardStats(
        total_orders=total,
        pending_orders=pending,
        active_orders=active,
        completed_orders=completed,
        total_revenue=revenue,
        total_menu_items=menu_count,
        avg_rating=restaurant.avg_rating,
        total_reviews=restaurant.total_reviews,
    )


# ---------------------------------------------------------------------------
# Reminders
# ---------------------------------------------------------------------------

@router.get("/reminders", response_model=list[ReminderResponse])
def list_reminders(
    current_user: User = Depends(require_role("owner")),
    db: Session = Depends(get_db),
):
    """List reminder logs for the owner's restaurant."""
    restaurant = db.query(Restaurant).filter(Restaurant.owner_id == current_user.id).first()
    if not restaurant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No restaurant found")

    reminders = (
        db.query(ReminderLog)
        .join(Order, ReminderLog.order_id == Order.id)
        .filter(Order.restaurant_id == restaurant.id)
        .order_by(ReminderLog.created_at.desc())
        .limit(50)
        .all()
    )
    return [ReminderResponse.model_validate(r) for r in reminders]


@router.post("/reminders/generate", response_model=list[ReminderResponse])
def generate_reminders(
    current_user: User = Depends(require_role("owner")),
    db: Session = Depends(get_db),
):
    """Manually trigger reminder generation for stale orders."""
    restaurant = db.query(Restaurant).filter(Restaurant.owner_id == current_user.id).first()
    if not restaurant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No restaurant found")

    threshold = datetime.now(timezone.utc) - timedelta(minutes=15)

    stale_orders = (
        db.query(Order)
        .filter(
            Order.restaurant_id == restaurant.id,
            Order.status.in_([OrderStatus.PLACED, OrderStatus.ACCEPTED]),
            Order.updated_at <= threshold,
        )
        .all()
    )

    new_reminders = []
    for order in stale_orders:
        # Avoid duplicates: don't remind if a reminder was created within the last 15 min
        recent = (
            db.query(ReminderLog)
            .filter(
                ReminderLog.order_id == order.id,
                ReminderLog.created_at >= threshold,
            )
            .first()
        )
        if recent:
            continue

        reminder = ReminderLog(
            order_id=order.id,
            message=f"Order #{order.id} has been in {order.status.value} status for over 15 minutes.",
        )
        db.add(reminder)
        new_reminders.append(reminder)

    db.commit()
    for r in new_reminders:
        db.refresh(r)
    return [ReminderResponse.model_validate(r) for r in new_reminders]

