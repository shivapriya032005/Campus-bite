"""Review, refund, and payment endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_role
from app.core.timeutil import utcnow
from app.db.session import get_db
from app.models.order import Order, OrderStatus
from app.models.payment_ledger import PaymentEntryType, PaymentLedger, PaymentStatus
from app.models.refund_record import RefundRecord
from app.models.restaurant import Restaurant
from app.models.return_request import ReturnRequest, ReturnRequestStatus
from app.models.review import Review
from app.models.user import User
from app.schemas.order import (
    PaymentLedgerResponse,
    RefundAction,
    ReturnRequestCreate,
    ReturnRequestResponse,
    ReviewCreate,
    ReviewResponse,
)

router = APIRouter(tags=["Reviews, Refunds & Payments"])


# ---------------------------------------------------------------------------
# Reviews
# ---------------------------------------------------------------------------

@router.post("/orders/{order_id}/review", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
def create_review(
    order_id: int,
    payload: ReviewCreate,
    current_user: User = Depends(require_role("customer")),
    db: Session = Depends(get_db),
):
    """Submit a review for a delivered order (one review per order)."""
    order = db.query(Order).filter(
        Order.id == order_id, Order.customer_id == current_user.id
    ).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if order.status != OrderStatus.DELIVERED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You can only review delivered orders",
        )
    if db.query(Review.id).filter(Review.order_id == order_id).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Review already submitted for this order")

    review = Review(
        order_id=order.id,
        customer_id=current_user.id,
        restaurant_id=order.restaurant_id,
        rating=payload.rating,
        comment=payload.comment,
    )
    db.add(review)

    # Atomic aggregate update: the database applies the increment under a row lock, so concurrent
    # reviews can never overwrite each other (no read-modify-write in Python). ``rating_sum`` keeps
    # the average exact instead of compounding rounding errors. In MySQL the SET clauses are
    # evaluated left to right, so the average is computed from the *old* sum/count before they change.
    db.execute(
        update(Restaurant)
        .where(Restaurant.id == order.restaurant_id)
        .ordered_values(
            (Restaurant.avg_rating, func.round((Restaurant.rating_sum + payload.rating) * 1.0 / (Restaurant.total_reviews + 1), 2)),
            (Restaurant.rating_sum, Restaurant.rating_sum + payload.rating),
            (Restaurant.total_reviews, Restaurant.total_reviews + 1),
        )
        .execution_options(synchronize_session=False)
    )
    try:
        db.commit()
    except IntegrityError:  # a concurrent request reviewed the same order first
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Review already submitted for this order")
    db.refresh(review)
    return ReviewResponse.model_validate(review)


@router.get("/restaurants/{restaurant_id}/reviews", response_model=list[ReviewResponse])
def list_restaurant_reviews(
    restaurant_id: int,
    response: Response,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List reviews for a restaurant (public, newest first)."""
    query = db.query(Review).filter(Review.restaurant_id == restaurant_id)
    response.headers["X-Total-Count"] = str(query.with_entities(func.count(Review.id)).scalar() or 0)
    reviews = (
        query.order_by(Review.created_at.desc(), Review.id.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return [ReviewResponse.model_validate(r) for r in reviews]


# ---------------------------------------------------------------------------
# Return / refund requests — customer
# ---------------------------------------------------------------------------

@router.post("/orders/{order_id}/return", response_model=ReturnRequestResponse, status_code=status.HTTP_201_CREATED)
def create_return_request(
    order_id: int,
    payload: ReturnRequestCreate,
    current_user: User = Depends(require_role("customer")),
    db: Session = Depends(get_db),
):
    """Submit a return/refund request for a delivered order."""
    order = db.query(Order).filter(
        Order.id == order_id, Order.customer_id == current_user.id
    ).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if order.status != OrderStatus.DELIVERED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Refund requests are only allowed for delivered orders",
        )
    if db.query(ReturnRequest.id).filter(ReturnRequest.order_id == order_id).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A return request already exists for this order")

    rr = ReturnRequest(
        order_id=order.id,
        customer_id=current_user.id,
        reason=payload.reason,
        status=ReturnRequestStatus.PENDING,
    )
    db.add(rr)
    try:
        db.commit()
    except IntegrityError:  # unique(order_id): a concurrent duplicate request
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A return request already exists for this order")
    db.refresh(rr)
    return ReturnRequestResponse.from_request(rr)


@router.get("/orders/{order_id}/return", response_model=ReturnRequestResponse)
def get_return_request(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the return request for an order (the customer who placed it, or the restaurant's owner)."""
    row = (
        db.query(ReturnRequest, Restaurant.owner_id)
        .join(Order, Order.id == ReturnRequest.order_id)
        .join(Restaurant, Restaurant.id == Order.restaurant_id)
        .filter(ReturnRequest.order_id == order_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No return request found")
    rr, owner_id = row
    if current_user.id not in (rr.customer_id, owner_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return ReturnRequestResponse.from_request(rr)


# ---------------------------------------------------------------------------
# Return / refund requests — owner manages
# ---------------------------------------------------------------------------

def _owner_restaurant(owner: User, db: Session) -> Restaurant:
    restaurant = db.query(Restaurant).filter(Restaurant.owner_id == owner.id).first()
    if not restaurant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No restaurant found")
    return restaurant


@router.get("/refunds/pending", response_model=list[ReturnRequestResponse])
def list_pending_refunds(
    response: Response,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    current_user: User = Depends(require_role("owner")),
    db: Session = Depends(get_db),
):
    """List pending return requests for the owner's restaurant (single joined query)."""
    restaurant = _owner_restaurant(current_user, db)
    query = (
        db.query(ReturnRequest)
        .join(Order, ReturnRequest.order_id == Order.id)
        .filter(
            Order.restaurant_id == restaurant.id,
            ReturnRequest.status == ReturnRequestStatus.PENDING,
        )
    )
    response.headers["X-Total-Count"] = str(query.with_entities(func.count(ReturnRequest.id)).scalar() or 0)
    requests = (
        query.order_by(ReturnRequest.created_at.desc(), ReturnRequest.id.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )
    return [ReturnRequestResponse.from_request(rr) for rr in requests]


@router.post("/refunds/{return_request_id}/action", response_model=ReturnRequestResponse)
def handle_refund(
    return_request_id: int,
    payload: RefundAction,
    current_user: User = Depends(require_role("owner")),
    db: Session = Depends(get_db),
):
    """Approve or reject a return/refund request.

    Approval atomically: marks the request approved, moves the order DELIVERED -> REFUNDED, adds a
    refund record and a ``refunded`` ledger entry (the original ``mock_paid`` entry is preserved).
    Both state changes are compare-and-set so a request cannot be processed twice.
    """
    restaurant = _owner_restaurant(current_user, db)

    rr = db.query(ReturnRequest).filter(ReturnRequest.id == return_request_id).first()
    if not rr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Return request not found")

    order = db.query(Order).filter(Order.id == rr.order_id).first()
    if not order or order.restaurant_id != restaurant.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your restaurant's order")

    if rr.status != ReturnRequestStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Request already {rr.status.value}",
        )

    now = utcnow()
    approve = payload.action == "approve"
    new_rr_status = ReturnRequestStatus.APPROVED if approve else ReturnRequestStatus.REJECTED

    claimed = db.execute(
        update(ReturnRequest)
        .where(ReturnRequest.id == rr.id, ReturnRequest.status == ReturnRequestStatus.PENDING)
        .values(status=new_rr_status, resolved_at=now)
        .execution_options(synchronize_session=False)
    )
    if (claimed.rowcount or 0) != 1:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Request was already processed")

    if approve:
        moved = db.execute(
            update(Order)
            .where(Order.id == order.id, Order.status == OrderStatus.DELIVERED)
            .values(status=OrderStatus.REFUNDED)
            .execution_options(synchronize_session=False)
        )
        if (moved.rowcount or 0) != 1:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Only delivered orders can be refunded",
            )
        db.add(RefundRecord(order_id=order.id, return_request_id=rr.id, amount=order.total_amount))
        db.add(
            PaymentLedger(
                order_id=order.id,
                entry_type=PaymentEntryType.REFUND,
                amount=order.total_amount,
                status=PaymentStatus.REFUNDED,
                reference_id=f"REF-{uuid.uuid4().hex[:12].upper()}",
            )
        )

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Refund was already recorded")
    db.refresh(rr)
    return ReturnRequestResponse.from_request(rr)


# ---------------------------------------------------------------------------
# Payments — view ledger
# ---------------------------------------------------------------------------

@router.get("/orders/{order_id}/payments", response_model=list[PaymentLedgerResponse])
def list_payments(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List payment ledger entries for an order (customer who placed it, or the restaurant's owner)."""
    row = (
        db.query(Order.customer_id, Restaurant.owner_id)
        .join(Restaurant, Restaurant.id == Order.restaurant_id)
        .filter(Order.id == order_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    customer_id, owner_id = row
    if current_user.id not in (customer_id, owner_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    entries = (
        db.query(PaymentLedger)
        .filter(PaymentLedger.order_id == order_id)
        .order_by(PaymentLedger.created_at, PaymentLedger.id)
        .all()
    )
    return [PaymentLedgerResponse.from_entry(e) for e in entries]
