"""Regression tests: cancellation ledger, cart merging, date filters, transactional integrity."""

from datetime import datetime, timedelta
from decimal import Decimal

import pytest
from sqlalchemy.exc import IntegrityError

from app.models.order import Order, OrderStatus
from app.models.payment_ledger import PaymentEntryType, PaymentLedger, PaymentStatus

from .helpers import PREFIX, headers, insert_order, make_store, place_order


# --------------------------------------------------------------------------- cancellation ledger

def test_cancel_preserves_payment_and_adds_void_entry(client, db_session):
    owner, customer, restaurant, burger, fries = make_store(db_session)
    order_id = place_order(client, customer, restaurant, [(burger.id, 2)]).json()["id"]

    res = client.post(f"{PREFIX}/orders/my/{order_id}/cancel", headers=headers(customer))
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "CANCELLED"
    assert body["payment_status"] == "voided"

    entries = db_session.query(PaymentLedger).filter_by(order_id=order_id).order_by(PaymentLedger.id).all()
    assert [(e.entry_type, e.status) for e in entries] == [
        (PaymentEntryType.PAYMENT, PaymentStatus.MOCK_PAID),  # original entry untouched
        (PaymentEntryType.VOID, PaymentStatus.VOIDED),
    ]
    assert entries[1].amount == entries[0].amount == Decimal("9.00")
    assert entries[0].reference_id != entries[1].reference_id

    ledger = client.get(f"{PREFIX}/orders/{order_id}/payments", headers=headers(customer)).json()
    assert [e["status"] for e in ledger] == ["mock_paid", "voided"]


def test_cancel_twice_creates_no_duplicate_void_entry(client, db_session):
    owner, customer, restaurant, burger, _ = make_store(db_session)
    order_id = place_order(client, customer, restaurant, [(burger.id, 1)]).json()["id"]
    assert client.post(f"{PREFIX}/orders/my/{order_id}/cancel", headers=headers(customer)).status_code == 200
    assert client.post(f"{PREFIX}/orders/my/{order_id}/cancel", headers=headers(customer)).status_code == 400
    assert db_session.query(PaymentLedger).filter_by(order_id=order_id, entry_type=PaymentEntryType.VOID).count() == 1


def test_database_rejects_duplicate_void_entries(db_session):
    owner, customer, restaurant, *_ = make_store(db_session)
    order = insert_order(db_session, customer, restaurant)
    for ref in ("V1", "V2"):
        db_session.add(
            PaymentLedger(order_id=order.id, entry_type=PaymentEntryType.VOID, amount=Decimal("1"),
                          status=PaymentStatus.VOIDED, reference_id=ref)
        )
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()


@pytest.mark.parametrize("status", [OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.DELIVERED])
def test_cancel_only_allowed_when_placed(client, db_session, status):
    owner, customer, restaurant, *_ = make_store(db_session)
    order = insert_order(db_session, customer, restaurant, status=status)
    res = client.post(f"{PREFIX}/orders/my/{order.id}/cancel", headers=headers(customer))
    assert res.status_code == 400
    assert db_session.query(PaymentLedger).filter_by(order_id=order.id, entry_type=PaymentEntryType.VOID).count() == 0


def test_cancel_other_customers_order_is_404(client, db_session):
    owner, customer, restaurant, burger, _ = make_store(db_session)
    other_owner, other_customer, *_ = make_store(db_session, suffix="2")
    order_id = place_order(client, customer, restaurant, [(burger.id, 1)]).json()["id"]
    assert client.post(f"{PREFIX}/orders/my/{order_id}/cancel", headers=headers(other_customer)).status_code == 404


# --------------------------------------------------------------------------- duplicate cart items

def test_duplicate_cart_items_are_merged(client, db_session):
    owner, customer, restaurant, burger, fries = make_store(db_session)
    res = place_order(client, customer, restaurant, [(burger.id, 1), (fries.id, 2), (burger.id, 3)])
    assert res.status_code == 201, res.text
    body = res.json()
    lines = {i["menu_item_id"]: i for i in body["items"]}
    assert len(body["items"]) == 2
    assert lines[burger.id]["quantity"] == 4
    assert Decimal(lines[burger.id]["subtotal"]) == Decimal("18.00")
    assert Decimal(body["total_amount"]) == Decimal("22.50")  # 4 * 4.50 + 2 * 2.25
    assert body["payment_status"] == "mock_paid"


def test_prices_come_from_database_not_client(client, db_session):
    owner, customer, restaurant, burger, _ = make_store(db_session)
    res = client.post(
        f"{PREFIX}/orders",
        json={"restaurant_id": restaurant.id, "delivery_address": "Dorm",
              "items": [{"menu_item_id": burger.id, "quantity": 1, "unit_price": "0.01", "price": 0.01}]},
        headers=headers(customer),
    )
    assert res.status_code == 201
    assert Decimal(res.json()["total_amount"]) == Decimal("4.50")


@pytest.mark.parametrize(
    "items, code",
    [
        ([(1, 0)], 422),
        ([(1, -1)], 422),
        ([(1, 51)], 422),
        ([(1, 30), (1, 30)], 422),  # merged quantity over the limit
        ([(9999, 1)], 400),
    ],
)
def test_checkout_validation_errors(client, db_session, items, code):
    owner, customer, restaurant, burger, _ = make_store(db_session)
    mapped = [(burger.id if i == 1 else i, q) for i, q in items]
    res = place_order(client, customer, restaurant, mapped)
    assert res.status_code == code
    assert res.json()["detail"]
    assert db_session.query(Order).count() == 0


def test_checkout_rejects_unavailable_and_foreign_items_with_clear_message(client, db_session):
    owner, customer, restaurant, burger, fries = make_store(db_session)
    fries.is_available = False
    db_session.commit()
    res = place_order(client, customer, restaurant, [(burger.id, 1), (fries.id, 1)])
    assert res.status_code == 400 and "Fries" in res.json()["detail"]

    _, _, other_restaurant, other_item, _ = make_store(db_session, suffix="2")
    res = place_order(client, customer, restaurant, [(other_item.id, 1)])
    assert res.status_code == 400 and str(other_item.id) in res.json()["detail"]


def test_blank_delivery_address_rejected(client, db_session):
    owner, customer, restaurant, burger, _ = make_store(db_session)
    res = client.post(
        f"{PREFIX}/orders",
        json={"restaurant_id": restaurant.id, "delivery_address": "   ",
              "items": [{"menu_item_id": burger.id, "quantity": 1}]},
        headers=headers(customer),
    )
    assert res.status_code == 422


# --------------------------------------------------------------------------- date filters

@pytest.mark.parametrize("path", ["/orders/my", "/orders/restaurant"])
@pytest.mark.parametrize(
    "params",
    [
        {"date_from": "not-a-date"},
        {"date_to": "2024-13-45"},
        {"date_from": "2024-05-02", "date_to": "2024-05-01"},
        {"date_from": "2024-05-01T10:00:00Z", "date_to": "2024-05-01T09:00:00Z"},
    ],
)
def test_invalid_date_filters_return_422(client, db_session, path, params):
    owner, customer, *_ = make_store(db_session)
    user = customer if path == "/orders/my" else owner
    res = client.get(f"{PREFIX}{path}", params=params, headers=headers(user))
    assert res.status_code == 422


def test_date_filters_boundaries_and_timezones(client, db_session):
    owner, customer, restaurant, *_ = make_store(db_session)
    early = insert_order(db_session, customer, restaurant, created_at=datetime(2024, 5, 1, 0, 0, 0))
    late = insert_order(db_session, customer, restaurant, created_at=datetime(2024, 5, 1, 23, 59, 59))
    next_day = insert_order(db_session, customer, restaurant, created_at=datetime(2024, 5, 2, 0, 0, 0))

    def ids(params, user=customer, path="/orders/my"):
        res = client.get(f"{PREFIX}{path}", params=params, headers=headers(user))
        assert res.status_code == 200, res.text
        return {o["id"] for o in res.json()["orders"]}

    # a plain date_to covers the whole day
    assert ids({"date_from": "2024-05-01", "date_to": "2024-05-01"}) == {early.id, late.id}
    assert ids({"date_from": "2024-05-02"}) == {next_day.id}
    assert ids({"date_to": "2024-05-01"}) == {early.id, late.id}
    # offsets are converted to UTC: 05:30+05:30 == 00:00Z
    assert ids({"date_from": "2024-05-01T05:30:00+05:30", "date_to": "2024-05-01T23:59:59Z"}) == {early.id, late.id}
    assert ids({"date_from": "2024-05-01T05:30:01+05:30", "date_to": "2024-05-01T23:59:59Z"}) == {late.id}
    # owner endpoint behaves identically
    assert ids({"date_from": "2024-05-02", "date_to": "2024-05-02"}, owner, "/orders/restaurant") == {next_day.id}


# --------------------------------------------------------------------------- pagination / filtering

def test_order_list_pagination_is_consistent(client, db_session):
    owner, customer, restaurant, *_ = make_store(db_session)
    created = [insert_order(db_session, customer, restaurant, age_minutes=i) for i in range(25)]
    seen: list[int] = []
    for page in (1, 2, 3):
        body = client.get(f"{PREFIX}/orders/my", params={"page": page, "per_page": 10}, headers=headers(customer)).json()
        assert body["total"] == 25
        seen.extend(o["id"] for o in body["orders"])
    assert len(seen) == len(set(seen)) == 25
    assert seen == [o.id for o in created]  # newest first (age 0 is newest)


def test_status_filter_and_invalid_status(client, db_session):
    owner, customer, restaurant, *_ = make_store(db_session)
    insert_order(db_session, customer, restaurant, status=OrderStatus.PLACED)
    insert_order(db_session, customer, restaurant, status=OrderStatus.DELIVERED)
    ok = client.get(f"{PREFIX}/orders/my", params={"status": "DELIVERED"}, headers=headers(customer)).json()
    assert ok["total"] == 1 and ok["orders"][0]["status"] == "DELIVERED"
    assert client.get(f"{PREFIX}/orders/my", params={"status": "NOPE"}, headers=headers(customer)).status_code == 400


# --------------------------------------------------------------------------- transaction integrity

def test_failed_checkout_leaves_no_partial_rows(client, db_session):
    owner, customer, restaurant, burger, _ = make_store(db_session)
    res = place_order(client, customer, restaurant, [(burger.id, 1), (424242, 1)])
    assert res.status_code == 400
    assert db_session.query(Order).count() == 0
    assert db_session.query(PaymentLedger).count() == 0


def test_cancel_is_atomic_when_a_later_step_fails(real_client, real_db, monkeypatch):
    """If the void entry/reminder bookkeeping fails, the status change must roll back too."""
    owner, customer, restaurant, burger, _ = make_store(real_db)
    order_id = place_order(real_client, customer, restaurant, [(burger.id, 1)]).json()["id"]

    import app.api.v1.endpoints.orders as orders_module

    def boom(*args, **kwargs):
        raise RuntimeError("simulated failure")

    monkeypatch.setattr(orders_module, "resolve_for_order", boom)
    with pytest.raises(RuntimeError):
        real_client.post(f"{PREFIX}/orders/my/{order_id}/cancel", headers=headers(customer))

    real_db.expire_all()
    assert real_db.get(Order, order_id).status == OrderStatus.PLACED
    assert real_db.query(PaymentLedger).filter_by(entry_type=PaymentEntryType.VOID).count() == 0


def test_owner_status_update_is_compare_and_set(real_client, real_db):
    """A status change racing with a cancellation must not overwrite it."""
    owner, customer, restaurant, burger, _ = make_store(real_db)
    order_id = place_order(real_client, customer, restaurant, [(burger.id, 1)]).json()["id"]
    assert real_client.post(f"{PREFIX}/orders/my/{order_id}/cancel", headers=headers(customer)).status_code == 200
    res = real_client.patch(f"{PREFIX}/orders/{order_id}/status", json={"status": "ACCEPTED"}, headers=headers(owner))
    assert res.status_code == 400
    real_db.expire_all()
    assert real_db.get(Order, order_id).status == OrderStatus.CANCELLED


def test_refund_revenue_excludes_refunded_orders(client, db_session):
    owner, customer, restaurant, *_ = make_store(db_session)
    insert_order(db_session, customer, restaurant, status=OrderStatus.DELIVERED, amount="10.00")
    insert_order(db_session, customer, restaurant, status=OrderStatus.REFUNDED, amount="7.00")
    insert_order(db_session, customer, restaurant, status=OrderStatus.CANCELLED, amount="3.00")
    stats = client.get(f"{PREFIX}/dashboard/stats", headers=headers(owner)).json()
    assert Decimal(stats["total_revenue"]) == Decimal("10.00")
    assert stats["total_orders"] == 3 and stats["completed_orders"] == 1


def test_active_and_multi_status_filters_paginate_on_the_server(client, db_session):
    owner, customer, restaurant, *_ = make_store(db_session)
    for status in (OrderStatus.PLACED, OrderStatus.PREPARING, OrderStatus.OUT_FOR_DELIVERY,
                   OrderStatus.DELIVERED, OrderStatus.CANCELLED, OrderStatus.REFUNDED):
        insert_order(db_session, customer, restaurant, status=status)

    def listing(path, user, **params):
        return client.get(f"{PREFIX}{path}", params=params, headers=headers(user)).json()

    active = listing("/orders/my", customer, status="ACTIVE", per_page=2, page=2)
    assert active["total"] == 3 and len(active["orders"]) == 1   # pagination is computed after filtering
    assert {o["status"] for o in listing("/orders/my", customer, status="ACTIVE")["orders"]} == {
        "PLACED", "PREPARING", "OUT_FOR_DELIVERY"}
    both = listing("/orders/my", customer, status="CANCELLED,REFUNDED")
    assert both["total"] == 2
    assert listing("/orders/restaurant", owner, status="active")["total"] == 3
