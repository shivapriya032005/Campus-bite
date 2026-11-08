"""Tests for delivery assignment, courier isolation, reviews, and refund approvals."""

from decimal import Decimal
from app.core.security import hash_password
from app.models.menu_item import MenuItem
from app.models.order import Order, OrderStatus
from app.models.restaurant import Restaurant
from app.models.user import User, UserRole


def _prepare_ready_order(db_session):
    owner = User(
        email="taco_owner@campus.edu",
        password_hash=hash_password("Pass1234!"),
        role=UserRole.OWNER,
        full_name="Taco Chef",
    )
    customer = User(
        email="taco_fan@campus.edu",
        password_hash=hash_password("Pass1234!"),
        role=UserRole.CUSTOMER,
        full_name="Taco Fan",
    )
    courier1 = User(
        email="courier1@campus.edu",
        password_hash=hash_password("Pass1234!"),
        role=UserRole.DELIVERY,
        full_name="Fast Rider 1",
    )
    courier2 = User(
        email="courier2@campus.edu",
        password_hash=hash_password("Pass1234!"),
        role=UserRole.DELIVERY,
        full_name="Fast Rider 2",
    )
    db_session.add_all([owner, customer, courier1, courier2])
    db_session.commit()

    restaurant = Restaurant(owner_id=owner.id, name="Campus Tacos")
    db_session.add(restaurant)
    db_session.commit()

    order = Order(
        customer_id=customer.id,
        restaurant_id=restaurant.id,
        status=OrderStatus.READY,
        total_amount=Decimal("20.00"),
        delivery_address="Engineering Hall 204",
    )
    db_session.add(order)
    db_session.commit()

    return owner, customer, courier1, courier2, restaurant, order


def test_delivery_assignment_and_progression(client, db_session, auth_headers):
    owner, customer, courier1, courier2, rest, order = _prepare_ready_order(db_session)
    owner_headers = auth_headers(owner.id, "owner")
    c1_headers = auth_headers(courier1.id, "delivery")
    c2_headers = auth_headers(courier2.id, "delivery")

    # 1. Owner assigns courier1
    assign_res = client.post(
        f"/api/v1/deliveries/assign/{order.id}",
        json={"delivery_partner_id": courier1.id},
        headers=owner_headers,
    )
    assert assign_res.status_code == 200
    assignment_id = assign_res.json()["id"]

    # 2. Courier isolation: Courier2 cannot view or update Courier1's assignment
    c2_view = client.get(f"/api/v1/deliveries/my/{assignment_id}", headers=c2_headers)
    assert c2_view.status_code == 404

    # 3. Courier1 picks up order: ASSIGNED -> OUT_FOR_DELIVERY
    c1_pickup = client.patch(
        f"/api/v1/deliveries/my/{assignment_id}/status",
        json={"status": "OUT_FOR_DELIVERY"},
        headers=c1_headers,
    )
    assert c1_pickup.status_code == 200
    assert c1_pickup.json()["status"] == "OUT_FOR_DELIVERY"

    # 4. Courier1 completes delivery: OUT_FOR_DELIVERY -> DELIVERED
    c1_delivered = client.patch(
        f"/api/v1/deliveries/my/{assignment_id}/status",
        json={"status": "DELIVERED"},
        headers=c1_headers,
    )
    assert c1_delivered.status_code == 200
    assert c1_delivered.json()["status"] == "DELIVERED"


def test_reviews_eligibility_and_duplicate_prevention(client, db_session, auth_headers):
    owner, customer, courier1, _, rest, order = _prepare_ready_order(db_session)
    cust_headers = auth_headers(customer.id, "customer")

    # Order is not delivered yet: Review should fail
    fail_review = client.post(
        f"/api/v1/orders/{order.id}/review",
        json={"rating": 5, "comment": "Great!"},
        headers=cust_headers,
    )
    assert fail_review.status_code == 400

    # Mark delivered
    order.status = OrderStatus.DELIVERED
    db_session.commit()

    # Submit review
    review_res = client.post(
        f"/api/v1/orders/{order.id}/review",
        json={"rating": 5, "comment": "Tacos were fresh and hot!"},
        headers=cust_headers,
    )
    assert review_res.status_code == 201

    # Second review on same order should fail (one review per order)
    dup_review = client.post(
        f"/api/v1/orders/{order.id}/review",
        json={"rating": 4, "comment": "Second review attempt"},
        headers=cust_headers,
    )
    assert dup_review.status_code == 409


def test_refund_workflow_and_ledger(client, db_session, auth_headers):
    owner, customer, _, _, rest, order = _prepare_ready_order(db_session)
    cust_headers = auth_headers(customer.id, "customer")
    owner_headers = auth_headers(owner.id, "owner")

    order.status = OrderStatus.DELIVERED
    db_session.commit()

    # 1. Customer submits refund claim
    ret_res = client.post(
        f"/api/v1/orders/{order.id}/return",
        json={"reason": "Salsa spilled, box crushed"},
        headers=cust_headers,
    )
    assert ret_res.status_code == 201
    claim_id = ret_res.json()["id"]

    # Duplicate refund request on same order should fail
    dup_ret = client.post(
        f"/api/v1/orders/{order.id}/return",
        json={"reason": "Another reason"},
        headers=cust_headers,
    )
    assert dup_ret.status_code == 409

    # 2. Owner approves refund
    action_res = client.post(
        f"/api/v1/refunds/{claim_id}/action",
        json={"action": "approve"},
        headers=owner_headers,
    )
    assert action_res.status_code == 200
    assert action_res.json()["status"] == "approved"

    # Verify order status updated to REFUNDED
    db_session.refresh(order)
    assert order.status == OrderStatus.REFUNDED

    # Verify refund ledger entry created
    pay_res = client.get(f"/api/v1/orders/{order.id}/payments", headers=cust_headers)
    entries = pay_res.json()
    assert any(e["entry_type"] == "refund" and e["status"] == "refunded" for e in entries)
