"""Dashboard and reminder endpoints."""

from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import case, func, select, update
from sqlalchemy.orm import Session

from app.core.security import require_role
from app.core.timeutil import utcnow
from app.db.session import get_db
from app.models.menu_item import MenuItem
from app.models.order import Order, OrderStatus
from app.models.reminder_log import ReminderLog, ReminderStatus
from app.models.restaurant import Restaurant
from app.models.user import User
from app.schemas.order import DashboardStats, ReminderResponse
from app.services.reminders import sync_reminders_and_commit

router = APIRouter(tags=["Dashboard & Reminders"])


def _owner_restaurant(owner: User, db: Session) -> Restaurant:
    restaurant = db.query(Restaurant).filter(Restaurant.owner_id == owner.id).first()
    if not restaurant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No restaurant found")
    return restaurant


def _count_where(*statuses: OrderStatus):
    return func.coalesce(func.sum(case((Order.status.in_(statuses), 1), else_=0)), 0)


@router.get("/dashboard/stats", response_model=DashboardStats)
def get_dashboard_stats(
    current_user: User = Depends(require_role("owner")),
    db: Session = Depends(get_db),
):
    """Return aggregate statistics for the owner's restaurant (one aggregate query)."""
    restaurant = _owner_restaurant(current_user, db)
    rid = restaurant.id

    menu_count = select(func.count(MenuItem.id)).where(MenuItem.restaurant_id == rid).scalar_subquery()
    total, pending, active, completed, revenue, menu_items = db.execute(
        select(
            func.count(Order.id),
            _count_where(OrderStatus.PLACED, OrderStatus.ACCEPTED),
            _count_where(
                OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.ASSIGNED, OrderStatus.OUT_FOR_DELIVERY
            ),
            _count_where(OrderStatus.DELIVERED),
            # Revenue is money actually kept: delivered orders only (refunded/cancelled are excluded).
            func.coalesce(
                func.sum(case((Order.status == OrderStatus.DELIVERED, Order.total_amount), else_=0)), 0
            ),
            menu_count,
        ).where(Order.restaurant_id == rid)
    ).one()

    return DashboardStats(
        total_orders=int(total or 0),
        pending_orders=int(pending),
        active_orders=int(active),
        completed_orders=int(completed),
        total_revenue=Decimal(str(revenue)).quantize(Decimal("0.01")),
        total_menu_items=int(menu_items or 0),
        avg_rating=restaurant.avg_rating,
        total_reviews=restaurant.total_reviews,
    )


# ---------------------------------------------------------------------------
# Reminders
# ---------------------------------------------------------------------------

@router.get("/reminders", response_model=list[ReminderResponse])
def list_reminders(
    response: Response,
    reminder_status: Literal["active", "resolved", "dismissed", "all"] = Query("active", alias="status"),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_role("owner")),
    db: Session = Depends(get_db),
):
    """List reminders for the owner's restaurant. Defaults to ACTIVE; use ``status=all`` for history."""
    restaurant = _owner_restaurant(current_user, db)

    query = (
        db.query(ReminderLog)
        .join(Order, ReminderLog.order_id == Order.id)
        .filter(Order.restaurant_id == restaurant.id)
    )
    if reminder_status != "all":
        query = query.filter(ReminderLog.status == ReminderStatus(reminder_status.upper()))

    response.headers["X-Total-Count"] = str(query.with_entities(func.count(ReminderLog.id)).scalar() or 0)
    reminders = (
        query.order_by(ReminderLog.created_at.desc(), ReminderLog.id.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return [ReminderResponse.model_validate(r) for r in reminders]


@router.post("/reminders/generate", response_model=list[ReminderResponse])
def generate_reminders(
    current_user: User = Depends(require_role("owner")),
    db: Session = Depends(get_db),
):
    """Manually trigger reminder generation (same idempotent logic as the scheduler)."""
    restaurant = _owner_restaurant(current_user, db)
    created = sync_reminders_and_commit(db, restaurant_id=restaurant.id)
    return [ReminderResponse.model_validate(r) for r in created]


@router.post("/reminders/{reminder_id}/dismiss", response_model=ReminderResponse)
def dismiss_reminder(
    reminder_id: int,
    current_user: User = Depends(require_role("owner")),
    db: Session = Depends(get_db),
):
    """Dismiss an ACTIVE reminder of the owner's restaurant. The row is kept as history."""
    restaurant = _owner_restaurant(current_user, db)

    reminder = (
        db.query(ReminderLog)
        .join(Order, ReminderLog.order_id == Order.id)
        .filter(ReminderLog.id == reminder_id, Order.restaurant_id == restaurant.id)
        .first()
    )
    if not reminder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reminder not found")

    previous_status = reminder.status.value.lower()
    result = db.execute(
        update(ReminderLog)
        .where(ReminderLog.id == reminder.id, ReminderLog.status == ReminderStatus.ACTIVE)
        .values(status=ReminderStatus.DISMISSED, dismissed_at=utcnow(), dismissed_by_id=current_user.id)
        .execution_options(synchronize_session=False)
    )
    if (result.rowcount or 0) != 1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Reminder is already {previous_status}",
        )
    db.commit()
    db.refresh(reminder)
    return ReminderResponse.model_validate(reminder)
