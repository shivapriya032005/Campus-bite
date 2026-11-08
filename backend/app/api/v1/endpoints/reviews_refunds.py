"""Review, refund, and payment endpoints."""

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_role
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
    RefundRecordResponse,
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
    existing = db.query(Review).filter(Review.order_id == order_id).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Review already submitted for this order")

    review = Review(
        order_id=order.id,
        customer_id=current_user.id,
        restaurant_id=order.restaurant_id,
        rating=payload.rating,
        comment=payload.comment,
    )
    db.add(review)

    # Update restaurant rating
    restaurant = db.query(Restaurant).filter(Restaurant.id == order.restaurant_id).first()
    if restaurant:
        new_total = restaurant.total_reviews + 1
        new_avg = (
            (restaurant.avg_rating * restaurant.total_reviews + payload.rating) / new_total
        )
        restaurant.avg_rating = round(Decimal(str(new_avg)), 2)
        restaurant.total_reviews = new_total

    db.commit()
    db.refresh(review)
    return ReviewResponse.model_validate(review)


@router.get("/restaurants/{restaurant_id}/reviews", response_model=list[ReviewResponse])
def list_restaurant_reviews(
    restaurant_id: int,
    db: Session = Depends(get_db),
):
    """List reviews for a restaurant (public)."""
    reviews = (
        db.query(Review)
        .filter(Review.restaurant_id == restaurant_id)
        .order_by(Review.created_at.desc())
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
    existing = db.query(ReturnRequest).filter(ReturnRequest.order_id == order_id).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A return request already exists for this order")

    rr = ReturnRequest(
        order_id=order.id,
        customer_id=current_user.id,
        reason=payload.reason,
        status=ReturnRequestStatus.PENDING,
    )
    db.add(rr)
    db.commit()
    db.refresh(rr)
    return ReturnRequestResponse.from_request(rr)


@router.get("/orders/{order_id}/return", response_model=ReturnRequestResponse)
def get_return_request(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the return request for an order (customer or owner)."""
    rr = db.query(ReturnRequest).filter(ReturnRequest.order_id == order_id).first()
    if not rr:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No return request found")
    # Verify access: customer who placed it, or owner of the restaurant
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    restaurant = db.query(Restaurant).filter(Restaurant.id == order.restaurant_id).first()
    if current_user.id not in (rr.customer_id, restaurant.owner_id if restaurant else -1):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return ReturnRequestResponse.from_request(rr)


# ---------------------------------------------------------------------------
# Return / refund requests — owner manages
# ---------------------------------------------------------------------------

@router.get("/refunds/pending", response_model=list[ReturnRequestResponse])
def list_pending_refunds(
    current_user: User = Depends(require_role("owner")),
    db: Session = Depends(get_db),
):
    """List pending return requests for the owner's restaurant."""
    restaurant = db.query(Restaurant).filter(Restaurant.owner_id == current_user.id).first()
    if not restaurant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No restaurant found")
    requests = (
        db.query(ReturnRequest)
        .join(Order, ReturnRequest.order_id == Order.id)
        .filter(
            Order.restaurant_id == restaurant.id,
            ReturnRequest.status == ReturnRequestStatus.PENDING,
        )
        .order_by(ReturnRequest.created_at.desc())
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
    """Approve or reject a return/refund request."""
    restaurant = db.query(Restaurant).filter(Restaurant.owner_id == current_user.id).first()
    if not restaurant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No restaurant found")

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

    now = datetime.now(timezone.utc)

    if payload.action == "approve":
        rr.status = ReturnRequestStatus.APPROVED
        rr.resolved_at = now

        # Create refund record
        refund = RefundRecord(
            order_id=order.id,
            return_request_id=rr.id,
            amount=order.total_amount,
        )
        db.add(refund)

        # Create refund payment ledger entry
        refund_payment = PaymentLedger(
            order_id=order.id,
            entry_type=PaymentEntryType.REFUND,
            amount=order.total_amount,
            status=PaymentStatus.REFUNDED,
            reference_id=f"REF-{uuid.uuid4().hex[:12].upper()}",
        )
        db.add(refund_payment)

        order.status = OrderStatus.REFUNDED
    else:
        rr.status = ReturnRequestStatus.REJECTED
        rr.resolved_at = now

    db.commit()
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
    """List payment ledger entries for an order."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    # Verify access
    restaurant = db.query(Restaurant).filter(Restaurant.id == order.restaurant_id).first()
    if current_user.id not in (order.customer_id, restaurant.owner_id if restaurant else -1):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    entries = (
        db.query(PaymentLedger)
        .filter(PaymentLedger.order_id == order_id)
        .order_by(PaymentLedger.created_at)
        .all()
    )
    return [PaymentLedgerResponse.from_entry(e) for e in entries]

