"""Administrative endpoints: approve / revoke restaurant-owner and delivery-partner accounts.

Protected by a static admin key (ADMIN_API_KEY, sent as the ``X-Admin-Key`` header). The feature is
disabled (HTTP 404) when ADMIN_API_KEY is not configured.
"""

import hmac

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy import update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.auth import UserResponse
from app.services.rate_limit import client_ip, enforce_rate_limit

router = APIRouter(prefix="/admin", tags=["Admin"])


def require_admin_key(
    request: Request,
    x_admin_key: str | None = Header(None),
    db: Session = Depends(get_db),
) -> None:
    if not settings.admin_api_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    enforce_rate_limit(
        db, f"admin:{client_ip(request)}",
        settings.rate_limit_login_max, settings.rate_limit_login_window_seconds,
    )
    if not x_admin_key or not hmac.compare_digest(x_admin_key.encode(), settings.admin_api_key.encode()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid admin key")


@router.get("/users", response_model=list[UserResponse], dependencies=[Depends(require_admin_key)])
def list_users(
    approved: bool | None = None,
    role: str | None = None,
    db: Session = Depends(get_db),
):
    """List users, e.g. ``?approved=false`` for accounts waiting for approval."""
    query = db.query(User)
    if approved is not None:
        query = query.filter(User.is_approved == approved)
    if role:
        try:
            query = query.filter(User.role == UserRole(role))
        except ValueError:
            raise HTTPException(status_code=422, detail="Invalid role")
    return [UserResponse.from_orm_user(u) for u in query.order_by(User.created_at.desc()).limit(200).all()]


def _set_approval(db: Session, user_id: int, approved: bool) -> UserResponse:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.role == UserRole.CUSTOMER:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Customers do not need approval")
    db.execute(update(User).where(User.id == user_id).values(is_approved=approved))
    db.commit()
    db.refresh(user)
    return UserResponse.from_orm_user(user)


@router.post("/users/{user_id}/approve", response_model=UserResponse, dependencies=[Depends(require_admin_key)])
def approve_user(user_id: int, db: Session = Depends(get_db)):
    return _set_approval(db, user_id, True)


@router.post("/users/{user_id}/revoke", response_model=UserResponse, dependencies=[Depends(require_admin_key)])
def revoke_user(user_id: int, db: Session = Depends(get_db)):
    return _set_approval(db, user_id, False)
