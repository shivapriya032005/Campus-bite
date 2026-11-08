"""Tests for cart checkout, payment ledger, valid transitions, and cancellation."""

from decimal import Decimal
from app.core.security import hash_password
from app.models.menu_item import MenuItem
from app.models.order import Order, OrderStatus
from app.models.payment_ledger import PaymentLedger, PaymentStatus
from app.models.restaurant import Restaurant
from app.models.user import User, UserRole


def _setup_store(db_session):
    owner = User(
        email="pizzeria@campus.edu",
        password_hash=hash_password("Pass1234!"),
        role=UserRole.OWNER,
        full_name="Pizza Master",
    )
    customer = User(
        email="hunger@campus.edu",
        password_hash=hash_password("Pass1234!"),
        role=UserRole.CUSTOMER,
        full_name="Hungry Student",
    )
    db_session.add_all([owner, customer])
    db_session.commit()

    restaurant = Restaurant(
        owner_id=owner.id,
        name="Campus Pizza",
        cuisine_type="Pizza",
    )
    db_session.add(restaurant)
    db_session.commit()

    item1 = MenuItem(
        restaurant_id=restaurant.id,
        name="Margherita Slice",
        price=Decimal("4.50"),
        is_available=True,
    )
    item2 = MenuItem(
        restaurant_id=restaurant.id,
        name="Pepperoni Slice",
        price=Decimal("5.00"),
        is_available=True,
    )
    db_session.add_all([item1, item2])
    db_session.commit()

    return owner, customer, restaurant, item1, item2


def test_order_placement_and_mock_payment(client, db_session, auth_headers):
    owner, customer, restaurant, item1, item2 = _setup_store(db_session)
    cust_headers = auth_headers(customer.id, "customer")

    order_payload = {
        "restaurant_id": restaurant.id,
        "items": [
            {"menu_item_id": item1.id, "quantity": 2},
            {"menu_item_id": item2.id, "quantity": 1},
        ],
        "delivery_address": "South Dorm, Room 101",
        "special_instructions": "Extra oregano",
    }
    response = client.post("/api/v1/orders", json=order_payload, headers=cust_headers)
    assert response.status_code == 201
    order_data = response.json()
    assert order_data["status"] == "PLACED"
    # 2 * 4.50 + 1 * 5.00 = 14.00
    assert float(order_data["total_amount"]) == 14.00
    assert len(order_data["items"]) == 2

    order_id = order_data["id"]

    # Verify payment ledger entry was automatically created
    payments_res = client.get(f"/api/v1/orders/{order_id}/payments", headers=cust_headers)
    assert payments_res.status_code == 200
    pay_entries = payments_res.json()
    assert len(pay_entries) == 1
    assert pay_entries[0]["status"] == "mock_paid"
    assert pay_entries[0]["entry_type"] == "payment"
    assert float(pay_entries[0]["amount"]) == 14.00


def test_order_lifecycle_transitions(client, db_session, auth_headers):
    owner, customer, restaurant, item1, _ = _setup_store(db_session)
    cust_headers = auth_headers(customer.id, "customer")
    owner_headers = auth_headers(owner.id, "owner")

    # Place order
    res = client.post(
        "/api/v1/orders",
        json={
            "restaurant_id": restaurant.id,
            "items": [{"menu_item_id": item1.id, "quantity": 1}],
            "delivery_address": "Campus Hall",
        },
        headers=cust_headers,
    )
    order_id = res.json()["id"]

    # Owner accepts order: PLACED -> ACCEPTED
    res_accept = client.patch(
        f"/api/v1/orders/{order_id}/status",
        json={"status": "ACCEPTED"},
        headers=owner_headers,
    )
    assert res_accept.status_code == 200
    assert res_accept.json()["status"] == "ACCEPTED"

    # Owner moves to PREPARING: ACCEPTED -> PREPARING
    res_prep = client.patch(
        f"/api/v1/orders/{order_id}/status",
        json={"status": "PREPARING"},
        headers=owner_headers,
    )
    assert res_prep.status_code == 200
    assert res_prep.json()["status"] == "PREPARING"

    # Owner moves to READY: PREPARING -> READY
    res_ready = client.patch(
        f"/api/v1/orders/{order_id}/status",
        json={"status": "READY"},
        headers=owner_headers,
    )
    assert res_ready.status_code == 200
    assert res_ready.json()["status"] == "READY"

    # Invalid jump directly to DELIVERED by owner should fail
    res_invalid = client.patch(
        f"/api/v1/orders/{order_id}/status",
        json={"status": "DELIVERED"},
        headers=owner_headers,
    )
    assert res_invalid.status_code in [400, 403]


def test_customer_cancellation_rules(client, db_session, auth_headers):
    owner, customer, restaurant, item1, _ = _setup_store(db_session)
    cust_headers = auth_headers(customer.id, "customer")
    owner_headers = auth_headers(owner.id, "owner")

    # Order 1: Cancel while in PLACED (allowed)
    res1 = client.post(
        "/api/v1/orders",
        json={
            "restaurant_id": restaurant.id,
            "items": [{"menu_item_id": item1.id, "quantity": 1}],
            "delivery_address": "Dorm 1",
        },
        headers=cust_headers,
    )
    order1_id = res1.json()["id"]

    cancel_res = client.post(f"/api/v1/orders/my/{order1_id}/cancel", headers=cust_headers)
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "CANCELLED"

    # Order 2: Cannot cancel once ACCEPTED
    res2 = client.post(
        "/api/v1/orders",
        json={
            "restaurant_id": restaurant.id,
            "items": [{"menu_item_id": item1.id, "quantity": 1}],
            "delivery_address": "Dorm 2",
        },
        headers=cust_headers,
    )
    order2_id = res2.json()["id"]

    client.patch(
        f"/api/v1/orders/{order2_id}/status",
        json={"status": "ACCEPTED"},
        headers=owner_headers,
    )

    cancel_fail = client.post(f"/api/v1/orders/my/{order2_id}/cancel", headers=cust_headers)
    assert cancel_fail.status_code == 400
    assert "cannot cancel" in cancel_fail.json()["detail"].lower()
