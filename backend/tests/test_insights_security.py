"""Tests for AI Insights security, isolation, and fallback handling."""

from decimal import Decimal
from unittest.mock import MagicMock, patch

from app.api.v1.endpoints.insights import _build_order_context
from app.core.security import hash_password
from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem
from app.models.restaurant import Restaurant
from app.models.user import User, UserRole


def test_ai_context_customer_data_isolation(db_session):
    # Customer 1
    c1 = User(
        email="c1@campus.edu",
        password_hash=hash_password("Pass1234!"),
        role=UserRole.CUSTOMER,
        full_name="Alice",
    )
    # Customer 2
    c2 = User(
        email="c2@campus.edu",
        password_hash=hash_password("Pass1234!"),
        role=UserRole.CUSTOMER,
        full_name="Bob",
    )
    owner = User(
        email="owner_ai@campus.edu",
        password_hash=hash_password("Pass1234!"),
        role=UserRole.OWNER,
        full_name="Chef",
    )
    db_session.add_all([c1, c2, owner])
    db_session.commit()

    rest = Restaurant(owner_id=owner.id, name="Campus Cafe")
    db_session.add(rest)
    db_session.commit()

    # Create order for Alice
    order_alice = Order(
        customer_id=c1.id,
        restaurant_id=rest.id,
        status=OrderStatus.DELIVERED,
        total_amount=Decimal("15.00"),
        delivery_address="Alice Room 1",
    )
    db_session.add(order_alice)
    db_session.flush()

    item_alice = OrderItem(
        order_id=order_alice.id,
        item_name="Secret Avocado Toast",
        unit_price=Decimal("15.00"),
        quantity=1,
        subtotal=Decimal("15.00"),
    )
    db_session.add(item_alice)
    db_session.commit()

    # Verify Alice's context contains her item
    alice_ctx = _build_order_context(c1.id, db_session)
    assert "Secret Avocado Toast" in alice_ctx

    # Verify Bob's context DOES NOT contain Alice's order data
    bob_ctx = _build_order_context(c2.id, db_session)
    assert "Secret Avocado Toast" not in bob_ctx
    assert "no orders yet" in bob_ctx.lower()


def test_ai_insights_unconfigured_api_key(client, db_session, auth_headers):
    customer = User(
        email="student_ai@campus.edu",
        password_hash=hash_password("Pass1234!"),
        role=UserRole.CUSTOMER,
        full_name="Student",
    )
    db_session.add(customer)
    db_session.commit()

    headers = auth_headers(customer.id, "customer")

    with patch("app.api.v1.endpoints.insights.settings.openai_api_key", None):
        res = client.post(
            "/api/v1/insights",
            json={"question": "What did I order yesterday?"},
            headers=headers,
        )
        assert res.status_code == 503
        assert "OPENAI_API_KEY" in res.json()["detail"]

