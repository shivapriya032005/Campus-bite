"""Shared factories for regression tests."""

from datetime import datetime, timedelta
from decimal import Decimal

from app.core.timeutil import utcnow

from app.core.security import create_access_token
from app.models.menu_item import MenuItem
from app.models.order import Order, OrderStatus
from app.models.payment_ledger import PaymentEntryType, PaymentLedger, PaymentStatus
from app.models.restaurant import Restaurant
from app.models.user import User, UserRole

PREFIX = "/api/v1"


def headers(user: User) -> dict:
    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return {"Authorization": f"Bearer {token}"}


def make_user(db, email: str, role: UserRole, approved: bool = True, name: str = "Test User") -> User:
    user = User(email=email, password_hash="not-a-real-hash", role=role, full_name=name, is_approved=approved)
    db.add(user)
    db.commit()
    return user


def make_store(db, suffix: str = "", approved: bool = True):
    """Owner + restaurant + two menu items + one customer."""
    owner = make_user(db, f"owner{suffix}@campus.edu", UserRole.OWNER, approved, "Owner")
    customer = make_user(db, f"cust{suffix}@campus.edu", UserRole.CUSTOMER, True, "Customer")
    restaurant = Restaurant(owner_id=owner.id, name=f"Diner{suffix}")
    db.add(restaurant)
    db.commit()
    burger = MenuItem(restaurant_id=restaurant.id, name="Burger", price=Decimal("4.50"), is_available=True)
    fries = MenuItem(restaurant_id=restaurant.id, name="Fries", price=Decimal("2.25"), is_available=True)
    db.add_all([burger, fries])
    db.commit()
    return owner, customer, restaurant, burger, fries


def place_order(client, customer: User, restaurant: Restaurant, items: list[tuple[int, int]]):
    return client.post(
        f"{PREFIX}/orders",
        json={
            "restaurant_id": restaurant.id,
            "items": [{"menu_item_id": i, "quantity": q} for i, q in items],
            "delivery_address": "Dorm 1",
        },
        headers=headers(customer),
    )


def insert_order(
    db, customer, restaurant, status=OrderStatus.PLACED, amount="10.00", age_minutes=0, created_at=None
) -> Order:
    """Insert an order directly (with its mock payment) and optionally age it."""
    moment = created_at or (utcnow() - timedelta(minutes=age_minutes))
    order = Order(
        customer_id=customer.id,
        restaurant_id=restaurant.id,
        status=status,
        total_amount=Decimal(amount),
        delivery_address="Dorm 1",
        created_at=moment,
        updated_at=moment,
    )
    db.add(order)
    db.flush()
    db.add(
        PaymentLedger(
            order_id=order.id,
            entry_type=PaymentEntryType.PAYMENT,
            amount=Decimal(amount),
            status=PaymentStatus.MOCK_PAID,
            reference_id=f"PAY-T{order.id}",
        )
    )
    db.commit()
    return order
