"""End-to-End audit test validating complete order lifecycle, cancellations, refunds, and reminders."""

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from fastapi.testclient import TestClient

from app.core.security import hash_password
from app.db.session import SessionLocal, get_db
from app.main import app
from app.models.delivery_assignment import DeliveryAssignment, DeliveryStatus
from app.models.menu_item import MenuItem
from app.models.order import Order, OrderStatus
from app.models.payment_ledger import PaymentEntryType, PaymentLedger, PaymentStatus
from app.models.reminder_log import ReminderLog
from app.models.restaurant import Restaurant
from app.models.return_request import ReturnRequest, ReturnRequestStatus
from app.models.review import Review
from app.models.user import User, UserRole
from app.tasks.reminders import check_stale_orders


def test_complete_order_lifecycle_and_audit(client, db_session, auth_headers):
    """
    Validates:
    Customer places order -> Owner accepts -> Preparing -> Ready ->
    Delivery partner assigned -> Out for delivery -> Delivered ->
    Customer submits review -> Customer requests refund -> Owner approves refund ->
    Ledger verified at every step.
    """
    # 1. Setup users
    customer = User(
        email="audit_cust@campus.edu",
        password_hash=hash_password("Pass1234!"),
        role=UserRole.CUSTOMER,
        full_name="Audit Customer",
        address="Dorm Hall 101",
    )
    owner = User(
        email="audit_owner@campus.edu",
        password_hash=hash_password("Pass1234!"),
        role=UserRole.OWNER,
        full_name="Audit Owner",
    )
    courier = User(
        email="audit_courier@campus.edu",
        password_hash=hash_password("Pass1234!"),
        role=UserRole.DELIVERY,
        full_name="Audit Courier",
    )
    db_session.add_all([customer, owner, courier])
    db_session.commit()

    cust_h = auth_headers(customer.id, "customer")
    owner_h = auth_headers(owner.id, "owner")
    courier_h = auth_headers(courier.id, "delivery")

    # 2. Setup restaurant and dish
    rest = Restaurant(
        owner_id=owner.id,
        name="Audit Diner",
        cuisine_type="American",
        address="Campus Plaza 1",
    )
    db_session.add(rest)
    db_session.commit()

    item = MenuItem(
        restaurant_id=rest.id,
        name="Signature Burger Combo",
        price=Decimal("15.50"),
        is_available=True,
    )
    db_session.add(item)
    db_session.commit()

    # STEP 1: Customer places order
    order_res = client.post(
        "/api/v1/orders",
        json={
            "restaurant_id": rest.id,
            "items": [{"menu_item_id": item.id, "quantity": 2}],
            "delivery_address": "Dorm Hall 101",
            "special_instructions": "No onions please",
        },
        headers=cust_h,
    )
    assert order_res.status_code == 201
    order_data = order_res.json()
    order_id = order_data["id"]
    assert order_data["status"] == "PLACED"
    assert float(order_data["total_amount"]) == 31.00

    # Verify payment ledger automatically created
    pay_res = client.get(f"/api/v1/orders/{order_id}/payments", headers=cust_h)
    assert pay_res.status_code == 200
    assert len(pay_res.json()) == 1
    assert pay_res.json()[0]["status"] == "mock_paid"
    assert pay_res.json()[0]["entry_type"] == "payment"
    assert float(pay_res.json()[0]["amount"]) == 31.00

    # STEP 2: Owner accepts order (PLACED -> ACCEPTED)
    res_accept = client.patch(
        f"/api/v1/orders/{order_id}/status",
        json={"status": "ACCEPTED"},
        headers=owner_h,
    )
    assert res_accept.status_code == 200
    assert res_accept.json()["status"] == "ACCEPTED"

    # STEP 3: Owner moves to preparing (ACCEPTED -> PREPARING)
    res_prep = client.patch(
        f"/api/v1/orders/{order_id}/status",
        json={"status": "PREPARING"},
        headers=owner_h,
    )
    assert res_prep.status_code == 200
    assert res_prep.json()["status"] == "PREPARING"

    # STEP 4: Owner marks order READY (PREPARING -> READY)
    res_ready = client.patch(
        f"/api/v1/orders/{order_id}/status",
        json={"status": "READY"},
        headers=owner_h,
    )
    assert res_ready.status_code == 200
    assert res_ready.json()["status"] == "READY"

    # STEP 5: Owner assigns delivery partner (READY -> ASSIGNED)
    assign_res = client.post(
        f"/api/v1/deliveries/assign/{order_id}",
        json={"delivery_partner_id": courier.id},
        headers=owner_h,
    )
    assert assign_res.status_code == 200
    assignment_id = assign_res.json()["id"]

    # Verify order transitioned to ASSIGNED
    ord_check = client.get(f"/api/v1/orders/my/{order_id}", headers=cust_h)
    assert ord_check.json()["status"] == "ASSIGNED"

    # STEP 6: Courier picks up order (ASSIGNED -> OUT_FOR_DELIVERY)
    pickup_res = client.patch(
        f"/api/v1/deliveries/my/{assignment_id}/status",
        json={"status": "OUT_FOR_DELIVERY"},
        headers=courier_h,
    )
    assert pickup_res.status_code == 200
    assert pickup_res.json()["status"] == "OUT_FOR_DELIVERY"

    ord_check2 = client.get(f"/api/v1/orders/my/{order_id}", headers=cust_h)
    assert ord_check2.json()["status"] == "OUT_FOR_DELIVERY"

    # STEP 7: Courier marks order DELIVERED (OUT_FOR_DELIVERY -> DELIVERED)
    deliver_res = client.patch(
        f"/api/v1/deliveries/my/{assignment_id}/status",
        json={"status": "DELIVERED"},
        headers=courier_h,
    )
    assert deliver_res.status_code == 200
    assert deliver_res.json()["status"] == "DELIVERED"

    ord_check3 = client.get(f"/api/v1/orders/my/{order_id}", headers=cust_h)
    assert ord_check3.json()["status"] == "DELIVERED"

    # STEP 8: Customer submits review (only valid after delivery)
    rev_res = client.post(
        f"/api/v1/orders/{order_id}/review",
        json={"rating": 5, "comment": "Delivered super fast and piping hot!"},
        headers=cust_h,
    )
    assert rev_res.status_code == 201
    assert rev_res.json()["rating"] == 5

    # STEP 9: Customer files refund dispute
    ret_res = client.post(
        f"/api/v1/orders/{order_id}/return",
        json={"reason": "Drinks were missing from bag"},
        headers=cust_h,
    )
    assert ret_res.status_code == 201
    claim_id = ret_res.json()["id"]
    assert ret_res.json()["status"] == "pending"

    # STEP 10: Owner approves refund claim
    refund_res = client.post(
        f"/api/v1/refunds/{claim_id}/action",
        json={"action": "approve"},
        headers=owner_h,
    )
    assert refund_res.status_code == 200
    assert refund_res.json()["status"] == "approved"

    # Verify order is now REFUNDED
    ord_check4 = client.get(f"/api/v1/orders/my/{order_id}", headers=cust_h)
    assert ord_check4.json()["status"] == "REFUNDED"

    # Verify payment ledger now has 2 entries: payment + refund
    final_payments = client.get(f"/api/v1/orders/{order_id}/payments", headers=cust_h).json()
    assert len(final_payments) == 2
    types = [p["entry_type"] for p in final_payments]
    assert "payment" in types
    assert "refund" in types
    refund_entry = next(p for p in final_payments if p["entry_type"] == "refund")
    assert refund_entry["status"] == "refunded"
    assert float(refund_entry["amount"]) == 31.00


def test_stale_order_reminders_audit(client, db_session, auth_headers):
    """Verifies that pending order reminders detect stale orders (>15 min) and record reminder logs."""
    owner = User(
        email="reminder_owner@campus.edu",
        password_hash=hash_password("Pass1234!"),
        role=UserRole.OWNER,
        full_name="Reminder Chef",
    )
    customer = User(
        email="reminder_cust@campus.edu",
        password_hash=hash_password("Pass1234!"),
        role=UserRole.CUSTOMER,
        full_name="Hungry Student",
    )
    db_session.add_all([owner, customer])
    db_session.commit()

    rest = Restaurant(owner_id=owner.id, name="Slow Kitchen")
    db_session.add(rest)
    db_session.commit()

    # Create an order placed 20 minutes ago
    past_time = datetime.now(timezone.utc) - timedelta(minutes=20)
    stale_order = Order(
        customer_id=customer.id,
        restaurant_id=rest.id,
        status=OrderStatus.PLACED,
        total_amount=Decimal("12.00"),
        delivery_address="Library 2nd Fl",
        created_at=past_time,
        updated_at=past_time,
    )
    db_session.add(stale_order)
    db_session.commit()

    owner_h = auth_headers(owner.id, "owner")

    # Call generate endpoint
    gen_res = client.post("/api/v1/reminders/generate", headers=owner_h)
    assert gen_res.status_code == 200
    reminders = gen_res.json()
    assert len(reminders) >= 1
    assert any(r["order_id"] == stale_order.id for r in reminders)
    assert "15 minutes" in reminders[0]["message"]

    # Calling it again immediately should NOT generate duplicate reminders
    gen_res_again = client.post("/api/v1/reminders/generate", headers=owner_h)
    assert gen_res_again.status_code == 200
    assert len(gen_res_again.json()) == 0

    # List reminders
    list_res = client.get("/api/v1/reminders", headers=owner_h)
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1
