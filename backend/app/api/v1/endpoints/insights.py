"""AI-powered order insights — OpenAI integration."""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.security import require_role
from app.db.session import get_db
from app.models.order import Order
from app.models.user import User
from app.schemas.order import InsightRequest, InsightResponse
from app.services.rate_limit import enforce_rate_limit

logger = logging.getLogger("campusbite.insights")

router = APIRouter(prefix="/insights", tags=["AI Insights"])


def _build_order_context(user_id: int, db: Session) -> str:
    """Build a concise textual summary of *this* customer's order history (two queries total)."""
    orders = (
        db.query(Order)
        .options(selectinload(Order.items))
        .filter(Order.customer_id == user_id)
        .order_by(Order.created_at.desc(), Order.id.desc())
        .limit(20)
        .all()
    )
    if not orders:
        return "This customer has no orders yet."

    lines = []
    for o in orders:
        item_str = ", ".join(f"{i.item_name} x{i.quantity} (${i.subtotal})" for i in o.items)
        lines.append(
            f"Order #{o.id} | {o.status.value} | ${o.total_amount} | "
            f"{o.created_at.strftime('%Y-%m-%d %H:%M')} | Items: {item_str}"
        )
    return chr(10).join(lines)


@router.post("", response_model=InsightResponse)
def ask_insight(
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

    # Per-user limit protects the OpenAI budget; counted before the (expensive) upstream call.
    enforce_rate_limit(
        db, f"ai:{current_user.id}", settings.rate_limit_ai_max, settings.rate_limit_ai_window_seconds
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
    except HTTPException:
        raise
    except Exception as e:
        if type(e).__name__ == "RateLimitError" or getattr(e, "status_code", None) == 429:
            logger.warning("OpenAI rate limit hit: %s", e)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="The AI service is busy right now. Please wait a moment and try again.",
                headers={"Retry-After": "30"},
            )
        logger.error("OpenAI API error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to get a response from the AI service. Please try again later.",
        )

    return InsightResponse(answer=answer)

