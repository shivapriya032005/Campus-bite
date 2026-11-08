"""AI-powered order insights — OpenAI integration."""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import require_role
from app.db.session import get_db
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.user import User
from app.schemas.order import InsightRequest, InsightResponse

logger = logging.getLogger("campusbite.insights")

router = APIRouter(prefix="/insights", tags=["AI Insights"])


def _build_order_context(user_id: int, db: Session) -> str:
    """Build a concise textual summary of the customer's order history."""
    orders = (
        db.query(Order)
        .filter(Order.customer_id == user_id)
        .order_by(Order.created_at.desc())
        .limit(20)
        .all()
    )
    if not orders:
        return "This customer has no orders yet."

    lines = []
    for o in orders:
        items = db.query(OrderItem).filter(OrderItem.order_id == o.id).all()
        item_str = ", ".join(f"{i.item_name} x{i.quantity} (${i.subtotal})" for i in items)
        lines.append(
            f"Order #{o.id} | {o.status.value} | ${o.total_amount} | "
            f"{o.created_at.strftime('%Y-%m-%d %H:%M')} | Items: {item_str}"
        )
    return "\n".join(lines)


@router.post("", response_model=InsightResponse)
async def ask_insight(
    payload: InsightRequest,
    current_user: User = Depends(require_role("customer")),
    db: Session = Depends(get_db),
):
    """Ask an AI-powered question about your order history."""
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "AI insights are not configured. "
                "Set the OPENAI_API_KEY environment variable to enable this feature."
            ),
        )

    context = _build_order_context(current_user.id, db)

    try:
        from openai import OpenAI

        client = OpenAI(api_key=settings.openai_api_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are CampusBite's order assistant. Answer the customer's question "
                        "based ONLY on their order data provided below. Be concise, helpful, "
                        "and friendly. If the data doesn't contain enough information, say so.\n\n"
                        f"Customer order history:\n{context}"
                    ),
                },
                {"role": "user", "content": payload.question},
            ],
            max_tokens=500,
            temperature=0.3,
            timeout=15,
        )
        answer = response.choices[0].message.content or "I couldn't generate an answer."
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OpenAI package is not installed.",
        )
    except Exception as e:
        logger.error("OpenAI API error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to get a response from the AI service. Please try again later.",
        )

    return InsightResponse(answer=answer)

