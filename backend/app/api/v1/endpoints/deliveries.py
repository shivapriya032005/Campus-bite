"""Delivery endpoints — assign, update status, view history."""

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.security import require_role
from app.core.timeutil import utcnow
from app.db.session import get_db
from app.models.delivery_assignment import DeliveryAssignment, DeliveryStatus
from app.models.order import Order, OrderStatus
from app.models.restaurant import Restaurant
from app.models.user import User, UserRole
from app.schemas.order import (
    DeliveryAssignmentResponse,
    DeliveryAssignRequest,
    DeliveryStatusUpdate,
    OrderResponse,
)

router = APIRouter(prefix="/deliveries", tags=["Deliveries"])


# ---------------------------------------------------------------------------
# Owner — assign a delivery partner to a READY order
# ---------------------------------------------------------------------------

@router.post("/assign/{order_id}", response_model=DeliveryAssignmentResponse)
def assign_delivery(
    order_id: int,
    payload: DeliveryAssignRequest,
    current_user: User = Depends(require_role("owner")),
    db: Session = Depends(get_db),
):
    """Assign a delivery partner to an order that is READY."""
    restaurant = db.query(Restaurant).filter(Restaurant.owner_id == current_user.id).first()
    if not restaurant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="You have no restaurant")

    order = db.query(Order).filter(
        Order.id == order_id, Order.restaurant_id == restaurant.id
    ).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if order.status != OrderStatus.READY:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order must be READY to assign delivery (current: {order.status.value})",
        )

    # Verify delivery partner exists and has the right role
    partner = db.query(User).filter(
        User.id == payload.delivery_partner_id,
        User.role == UserRole.DELIVERY,
        User.is_active == True,  # noqa: E712
        User.is_approved == True,  # noqa: E712
    ).first()
    if not partner:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Delivery partner not found")

    # Check if already assigned
    existing = db.query(DeliveryAssignment).filter(DeliveryAssignment.order_id == order_id).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Order already has a delivery assignment")

    # Compare-and-set READY -> ASSIGNED, then create the assignment, in one transaction.
    result = db.execute(
        update(Order)
        .where(Order.id == order.id, Order.status == OrderStatus.READY)
        .values(status=OrderStatus.ASSIGNED)
        .execution_options(synchronize_session=False)
    )
    if (result.rowcount or 0) != 1:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Order is no longer READY")
    assignment = DeliveryAssignment(
        order_id=order.id,
        delivery_partner_id=partner.id,
        status=DeliveryStatus.ASSIGNED,
    )
    db.add(assignment)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Order already has a delivery assignment")
    db.refresh(assignment)
    return DeliveryAssignmentResponse.from_assignment(assignment)


# ---------------------------------------------------------------------------
# Owner — list available delivery partners
# ---------------------------------------------------------------------------

@router.get("/partners", response_model=list[dict])
def list_delivery_partners(
    current_user: User = Depends(require_role("owner")),
    db: Session = Depends(get_db),
):
    """List all active, approved delivery partners."""
    partners = db.query(User).filter(
        User.role == UserRole.DELIVERY,
        User.is_active == True,  # noqa: E712
        User.is_approved == True,  # noqa: E712
    ).order_by(User.full_name).all()
    return [
        {"id": p.id, "full_name": p.full_name, "email": p.email, "phone": p.phone}
        for p in partners
    ]


# ---------------------------------------------------------------------------
# Delivery partner — view assigned deliveries
# ---------------------------------------------------------------------------

@router.get("/my", response_model=list[DeliveryAssignmentResponse])
def list_my_deliveries(
    response: Response,
    status_filter: str | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    per_page: int = Query(100, ge=1, le=200),
    current_user: User = Depends(require_role("delivery")),
    db: Session = Depends(get_db),
):
    """List deliveries assigned to the current delivery partner."""
    query = db.query(DeliveryAssignment).filter(
        DeliveryAssignment.delivery_partner_id == current_user.id
    )
    if status_filter:
        try:
            query = query.filter(DeliveryAssignment.status == DeliveryStatus(status_filter))
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status filter")
    response.headers["X-Total-Count"] = str(query.with_entities(func.count(DeliveryAssignment.id)).scalar() or 0)
    assignments = (
        query.order_by(DeliveryAssignment.assigned_at.desc(), DeliveryAssignment.id.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return [DeliveryAssignmentResponse.from_assignment(a) for a in assignments]


@router.get("/my/{assignment_id}", response_model=dict)
def get_delivery_detail(
    assignment_id: int,
    current_user: User = Depends(require_role("delivery")),
    db: Session = Depends(get_db),
):
    """Get full delivery detail including customer and restaurant info."""
    assignment = (
        db.query(DeliveryAssignment)
        .options(
            selectinload(DeliveryAssignment.order).selectinload(Order.customer),
            selectinload(DeliveryAssignment.order).selectinload(Order.restaurant),
            selectinload(DeliveryAssignment.order).selectinload(Order.items),
            selectinload(DeliveryAssignment.order).selectinload(Order.payment_entries),
        )
        .filter(
            DeliveryAssignment.id == assignment_id,
            DeliveryAssignment.delivery_partner_id == current_user.id,
        )
        .first()
    )
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")

    order = assignment.order
    return {
        "assignment": DeliveryAssignmentResponse.from_assignment(assignment).model_dump(),
        "order": OrderResponse.from_order(order).model_dump(),
        "customer": {
            "name": order.customer.full_name,
            "phone": order.customer.phone,
            "address": order.delivery_address,
        },
        "restaurant": {
            "name": order.restaurant.name,
            "phone": order.restaurant.phone,
            "address": order.restaurant.address,
        },
    }


# ---------------------------------------------------------------------------
# Delivery partner — update delivery status
# ---------------------------------------------------------------------------

@router.patch("/my/{assignment_id}/status", response_model=DeliveryAssignmentResponse)
def update_delivery_status(
    assignment_id: int,
    payload: DeliveryStatusUpdate,
    current_user: User = Depends(require_role("delivery")),
    db: Session = Depends(get_db),
):
    """Update delivery status (ASSIGNED -> OUT_FOR_DELIVERY -> DELIVERED) of one of *my* assignments."""
    assignment = db.query(DeliveryAssignment).filter(
        DeliveryAssignment.id == assignment_id,
        DeliveryAssignment.delivery_partner_id == current_user.id,
    ).first()
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")

    new_status = DeliveryStatus(payload.status)
    transitions = {
        DeliveryStatus.ASSIGNED: DeliveryStatus.OUT_FOR_DELIVERY,
        DeliveryStatus.OUT_FOR_DELIVERY: DeliveryStatus.DELIVERED,
    }
    if transitions.get(assignment.status) != new_status:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition from {assignment.status.value} to {new_status.value}",
        )

    now = utcnow()
    previous_order_status = OrderStatus(assignment.status.value)
    # Compare-and-set on the order so assignment and order can never diverge.
    result = db.execute(
        update(Order)
        .where(Order.id == assignment.order_id, Order.status == previous_order_status)
        .values(status=OrderStatus(new_status.value))
        .execution_options(synchronize_session=False)
    )
    if (result.rowcount or 0) != 1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The order is not in the expected state for this update",
        )
    values = {"status": new_status}
    if new_status == DeliveryStatus.OUT_FOR_DELIVERY:
        values["picked_up_at"] = now
    else:
        values["delivered_at"] = now
    db.execute(
        update(DeliveryAssignment)
        .where(DeliveryAssignment.id == assignment.id, DeliveryAssignment.status == assignment.status)
        .values(**values)
        .execution_options(synchronize_session=False)
    )
    db.commit()
    db.refresh(assignment)
    return DeliveryAssignmentResponse.from_assignment(assignment)
