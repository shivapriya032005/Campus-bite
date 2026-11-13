"""Menu-item endpoints — CRUD for owners, browsing for customers."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_role
from app.db.session import get_db
from app.models.menu_item import MenuItem
from app.models.restaurant import Restaurant
from app.models.user import User
from app.schemas.menu_item import (
    MenuItemCreate,
    MenuItemListResponse,
    MenuItemResponse,
    MenuItemUpdate,
)

router = APIRouter(prefix="/menu-items", tags=["Menu Items"])


# ---------------------------------------------------------------------------
# Public — browse a restaurant's menu
# ---------------------------------------------------------------------------

@router.get("/restaurant/{restaurant_id}", response_model=MenuItemListResponse)
def list_menu_items(
    restaurant_id: int,
    search: str | None = Query(None, max_length=100),
    min_price: float | None = Query(None, ge=0),
    max_price: float | None = Query(None, ge=0),
    category: str | None = Query(None, max_length=100),
    db: Session = Depends(get_db),
):
    """List menu items of a restaurant with optional search / price filters."""
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Restaurant not found")

    if min_price is not None and max_price is not None and min_price > max_price:
        raise HTTPException(
            status_code=422, detail="min_price must not exceed max_price"
        )
    query = db.query(MenuItem).filter(
        MenuItem.restaurant_id == restaurant_id,
        MenuItem.is_available == True,  # noqa: E712
    )
    if search:
        query = query.filter(MenuItem.name.ilike(f"%{search}%"))
    if min_price is not None:
        query = query.filter(MenuItem.price >= min_price)
    if max_price is not None:
        query = query.filter(MenuItem.price <= max_price)
    if category:
        query = query.filter(MenuItem.category.ilike(f"%{category}%"))

    items = query.order_by(MenuItem.category, MenuItem.name).all()
    return MenuItemListResponse(
        items=[MenuItemResponse.model_validate(i) for i in items],
        total=len(items),
    )


@router.get("/{item_id}", response_model=MenuItemResponse)
def get_menu_item(item_id: int, db: Session = Depends(get_db)):
    """Get a single menu item by ID."""
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu item not found")
    return MenuItemResponse.model_validate(item)


# ---------------------------------------------------------------------------
# Owner-only CRUD
# ---------------------------------------------------------------------------

def _owner_restaurant(current_user: User, db: Session) -> Restaurant:
    """Helper — get the restaurant owned by the current user or 404."""
    restaurant = db.query(Restaurant).filter(Restaurant.owner_id == current_user.id).first()
    if not restaurant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="You have no restaurant")
    return restaurant


@router.get("/owner/all", response_model=MenuItemListResponse)
def list_owner_menu_items(
    current_user: User = Depends(require_role("owner")),
    db: Session = Depends(get_db),
):
    """List *all* menu items (including unavailable) for the owner's restaurant."""
    restaurant = _owner_restaurant(current_user, db)
    items = (
        db.query(MenuItem)
        .filter(MenuItem.restaurant_id == restaurant.id)
        .order_by(MenuItem.category, MenuItem.name)
        .all()
    )
    return MenuItemListResponse(
        items=[MenuItemResponse.model_validate(i) for i in items],
        total=len(items),
    )


@router.post("", response_model=MenuItemResponse, status_code=status.HTTP_201_CREATED)
def create_menu_item(
    payload: MenuItemCreate,
    current_user: User = Depends(require_role("owner")),
    db: Session = Depends(get_db),
):
    """Add a menu item to the owner's restaurant."""
    restaurant = _owner_restaurant(current_user, db)
    item = MenuItem(restaurant_id=restaurant.id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return MenuItemResponse.model_validate(item)


@router.put("/{item_id}", response_model=MenuItemResponse)
def update_menu_item(
    item_id: int,
    payload: MenuItemUpdate,
    current_user: User = Depends(require_role("owner")),
    db: Session = Depends(get_db),
):
    """Update a menu item belonging to the owner's restaurant."""
    restaurant = _owner_restaurant(current_user, db)
    item = db.query(MenuItem).filter(
        MenuItem.id == item_id, MenuItem.restaurant_id == restaurant.id
    ).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu item not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return MenuItemResponse.model_validate(item)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_menu_item(
    item_id: int,
    current_user: User = Depends(require_role("owner")),
    db: Session = Depends(get_db),
):
    """Delete a menu item from the owner's restaurant."""
    restaurant = _owner_restaurant(current_user, db)
    item = db.query(MenuItem).filter(
        MenuItem.id == item_id, MenuItem.restaurant_id == restaurant.id
    ).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu item not found")
    db.delete(item)
    db.commit()

