"""Restaurant endpoints — CRUD + public listing."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_role
from app.db.session import get_db
from app.models.restaurant import Restaurant
from app.models.user import User
from app.schemas.restaurant import (
    RestaurantCreate,
    RestaurantListResponse,
    RestaurantResponse,
    RestaurantUpdate,
)

router = APIRouter(prefix="/restaurants", tags=["Restaurants"])


# ---------------------------------------------------------------------------
# Public
# ---------------------------------------------------------------------------

@router.get("", response_model=RestaurantListResponse)
def list_restaurants(
    search: str | None = Query(None, max_length=100),
    page: int = Query(1, ge=1),
    per_page: int = Query(12, ge=1, le=50),
    db: Session = Depends(get_db),
):
    """List active restaurants with optional search."""
    query = db.query(Restaurant).filter(Restaurant.is_active == True)  # noqa: E712
    if search:
        query = query.filter(
            Restaurant.name.ilike(f"%{search}%")
            | Restaurant.cuisine_type.ilike(f"%{search}%")
        )
    total = query.count()
    restaurants = query.order_by(Restaurant.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return RestaurantListResponse(
        restaurants=[RestaurantResponse.model_validate(r) for r in restaurants],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get("/{restaurant_id}", response_model=RestaurantResponse)
def get_restaurant(restaurant_id: int, db: Session = Depends(get_db)):
    """Get restaurant details by ID."""
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restaurant not found")
    return RestaurantResponse.model_validate(restaurant)


# ---------------------------------------------------------------------------
# Owner-only
# ---------------------------------------------------------------------------

@router.post("", response_model=RestaurantResponse, status_code=status.HTTP_201_CREATED)
def create_restaurant(
    payload: RestaurantCreate,
    current_user: User = Depends(require_role("owner")),
    db: Session = Depends(get_db),
):
    """Create a restaurant for the authenticated owner."""
    existing = db.query(Restaurant).filter(Restaurant.owner_id == current_user.id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already own a restaurant",
        )
    restaurant = Restaurant(owner_id=current_user.id, **payload.model_dump())
    db.add(restaurant)
    db.commit()
    db.refresh(restaurant)
    return RestaurantResponse.model_validate(restaurant)


@router.put("/{restaurant_id}", response_model=RestaurantResponse)
def update_restaurant(
    restaurant_id: int,
    payload: RestaurantUpdate,
    current_user: User = Depends(require_role("owner")),
    db: Session = Depends(get_db),
):
    """Update the authenticated owner's restaurant."""
    restaurant = db.query(Restaurant).filter(
        Restaurant.id == restaurant_id, Restaurant.owner_id == current_user.id
    ).first()
    if not restaurant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restaurant not found or not yours")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(restaurant, field, value)
    db.commit()
    db.refresh(restaurant)
    return RestaurantResponse.model_validate(restaurant)

