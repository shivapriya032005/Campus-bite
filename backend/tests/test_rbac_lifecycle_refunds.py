"""Regression tests: RBAC, customer/owner/courier data isolation, order lifecycle, refund workflow, ratings."""

from decimal import Decimal

import pytest

from app.models.order import Order, OrderStatus
from app.models.payment_ledger import PaymentLedger
from app.models.refund_record import RefundRecord
from app.models.restaurant import Restaurant
from app.models.user import UserRole

from .helpers import PREFIX, headers, insert_order, make_store, make_user, place_order


def _courier(db, email="courier@campus.edu"):
    return make_user(db, email, UserRole.DELIVERY)


def _deliver(client, owner, courier, order_id):
    """Walk an order from PLACED to DELIVERED through the real endpoints."""
    for status in ("ACCEPTED", "PREPARING", "READY"):
        res = client.patch(f"{PREFIX}/orders/{order_id}/status", json={"status": status}, headers=headers(owner))
        assert res.status_code == 200, res.text
    res = client.post(f"{PREFIX}/deliveries/assign/{order_id}", json={"delivery_partner_id": courier.id},
                      headers=headers(owner))
    assert res.status_code == 200, res.text
    assignment_id = res.json()["id"]
    for status in ("OUT_FOR_DELIVERY", "DELIVERED"):
        res = client.patch(f"{PREFIX}/deliveries/my/{assignment_id}/status", json={"status": status},
                           headers=headers(courier))
        assert res.status_code == 200, res.text
    return assignment_id


# --------------------------------------------------------------------------- authentication / RBAC

@pytest.mark.parametrize(
    "method, path",
    [("get", "/orders/my"), ("get", "/orders/restaurant"), ("post", "/orders"), ("get", "/deliveries/my"),
     ("get", "/dashboard/stats"), ("get", "/reminders"), ("post", "/insights"), ("get", "/refunds/pending")],
)
def test_protected_endpoints_require_authentication(client, method, path):
    assert getattr(client, method)(f"{PREFIX}{path}").status_code == 401


def test_invalid_or_tampered_token_is_rejected(client):
    assert client.get(f"{PREFIX}/orders/my", headers={"Authorization": "Bearer garbage"}).status_code == 401


def test_roles_cannot_cross_into_each_others_endpoints(client, db_session):
    owner, customer, restaurant, burger, _ = make_store(db_session)
    courier = _courier(db_session)
    forbidden = [
        (customer, "get", "/orders/restaurant"), (customer, "get", "/dashboard/stats"),
        (customer, "get", "/deliveries/my"), (customer, "get", "/refunds/pending"),
        (owner, "get", "/orders/my"), (owner, "post", "/insights"), (owner, "get", "/deliveries/my"),
        (courier, "get", "/orders/my"), (courier, "get", "/orders/restaurant"), (courier, "get", "/reminders"),
        (courier, "get", "/dashboard/stats"), (courier, "get", "/deliveries/partners"),
    ]
    for user, method, path in forbidden:
        assert getattr(client, method)(f"{PREFIX}{path}", headers=headers(user)).status_code == 403, (user.role, path)
    assert place_order(client, owner, restaurant, [(burger.id, 1)]).status_code == 403
    assert place_order(client, courier, restaurant, [(burger.id, 1)]).status_code == 403


def test_token_for_deactivated_user_is_rejected(client, db_session):
    _, customer, *_ = make_store(db_session)
    customer.is_active = False
    db_session.commit()
    assert client.get(f"{PREFIX}/orders/my", headers=headers(customer)).status_code == 401


# --------------------------------------------------------------------------- data isolation

def test_customer_cannot_read_another_customers_data(client, db_session):
    owner, alice, restaurant, burger, _ = make_store(db_session, "1")
    bob = make_user(db_session, "bob@campus.edu", UserRole.CUSTOMER)
    order_id = place_order(client, alice, restaurant, [(burger.id, 1)]).json()["id"]
    _deliver(client, owner, _courier(db_session), order_id)

    assert client.get(f"{PREFIX}/orders/my/{order_id}", headers=headers(bob)).status_code == 404
    assert client.get(f"{PREFIX}/orders/my", headers=headers(bob)).json()["total"] == 0
    assert client.get(f"{PREFIX}/orders/{order_id}/payments", headers=headers(bob)).status_code == 403
    assert client.post(f"{PREFIX}/orders/{order_id}/review", json={"rating": 1}, headers=headers(bob)).status_code == 404
    assert client.post(f"{PREFIX}/orders/{order_id}/return", json={"reason": "x"}, headers=headers(bob)).status_code == 404
    client.post(f"{PREFIX}/orders/{order_id}/return", json={"reason": "cold"}, headers=headers(alice))
    assert client.get(f"{PREFIX}/orders/{order_id}/return", headers=headers(bob)).status_code == 403


def test_ai_context_contains_only_the_callers_orders(db_session):
    from app.api.v1.endpoints.insights import _build_order_context

    owner, alice, restaurant, *_ = make_store(db_session, "1")
    bob = make_user(db_session, "bob@campus.edu", UserRole.CUSTOMER)
    mine = insert_order(db_session, alice, restaurant, amount="11.11")
    theirs = insert_order(db_session, bob, restaurant, amount="99.99")
    context = _build_order_context(alice.id, db_session)
    assert f"Order #{mine.id}" in context and f"Order #{theirs.id}" not in context
    assert "99.99" not in context


def test_owner_cannot_manage_another_restaurants_orders_menu_or_refunds(client, db_session):
    owner, customer, restaurant, burger, _ = make_store(db_session, "1")
    other_owner, _, other_restaurant, other_item, _ = make_store(db_session, "2")
    courier = _courier(db_session)
    order_id = place_order(client, customer, restaurant, [(burger.id, 1)]).json()["id"]

    assert client.patch(f"{PREFIX}/orders/{order_id}/status", json={"status": "ACCEPTED"},
                        headers=headers(other_owner)).status_code == 404
    assert client.put(f"{PREFIX}/menu-items/{burger.id}", json={"price": "0.01"},
                      headers=headers(other_owner)).status_code == 404
    assert client.delete(f"{PREFIX}/menu-items/{burger.id}", headers=headers(other_owner)).status_code == 404
    assert client.put(f"{PREFIX}/restaurants/{restaurant.id}", json={"name": "Hijacked"},
                      headers=headers(other_owner)).status_code == 404
    assert client.get(f"{PREFIX}/orders/restaurant", headers=headers(other_owner)).json()["total"] == 0

    _deliver(client, owner, courier, order_id)
    rr = client.post(f"{PREFIX}/orders/{order_id}/return", json={"reason": "cold"}, headers=headers(customer)).json()
    assert client.post(f"{PREFIX}/refunds/{rr['id']}/action", json={"action": "approve"},
                       headers=headers(other_owner)).status_code == 403
    assert client.get(f"{PREFIX}/refunds/pending", headers=headers(other_owner)).json() == []
    assert db_session.get(Order, order_id).status == OrderStatus.DELIVERED


def test_courier_only_sees_and_updates_own_assignments(client, db_session):
    owner, customer, restaurant, burger, _ = make_store(db_session)
    mine, theirs = _courier(db_session, "c1@campus.edu"), _courier(db_session, "c2@campus.edu")
    order_id = place_order(client, customer, restaurant, [(burger.id, 1)]).json()["id"]
    for status in ("ACCEPTED", "PREPARING", "READY"):
        client.patch(f"{PREFIX}/orders/{order_id}/status", json={"status": status}, headers=headers(owner))
    assignment = client.post(f"{PREFIX}/deliveries/assign/{order_id}", json={"delivery_partner_id": mine.id},
                             headers=headers(owner)).json()

    assert client.get(f"{PREFIX}/deliveries/my", headers=headers(theirs)).json() == []
    assert client.get(f"{PREFIX}/deliveries/my/{assignment['id']}", headers=headers(theirs)).status_code == 404
    assert client.patch(f"{PREFIX}/deliveries/my/{assignment['id']}/status", json={"status": "OUT_FOR_DELIVERY"},
                        headers=headers(theirs)).status_code == 404
    detail = client.get(f"{PREFIX}/deliveries/my/{assignment['id']}", headers=headers(mine)).json()
    assert detail["customer"]["address"] == "Dorm 1"


# --------------------------------------------------------------------------- order lifecycle

def test_full_lifecycle_and_payment_state(client, db_session):
    owner, customer, restaurant, burger, _ = make_store(db_session)
    order_id = place_order(client, customer, restaurant, [(burger.id, 2)]).json()["id"]
    _deliver(client, owner, _courier(db_session), order_id)
    order = client.get(f"{PREFIX}/orders/my/{order_id}", headers=headers(customer)).json()
    assert order["status"] == "DELIVERED" and order["payment_status"] == "mock_paid"


@pytest.mark.parametrize(
    "start, target, expected",
    [
        (OrderStatus.PLACED, "READY", 400),
        (OrderStatus.PLACED, "DELIVERED", 400),
        (OrderStatus.ACCEPTED, "PLACED", 400),
        (OrderStatus.PREPARING, "ACCEPTED", 400),
        (OrderStatus.READY, "ASSIGNED", 403),         # only via the delivery-assignment endpoint
        (OrderStatus.PLACED, "CANCELLED", 403),       # owners cannot cancel
        (OrderStatus.DELIVERED, "REFUNDED", 403),     # only via the refund workflow
        (OrderStatus.CANCELLED, "ACCEPTED", 400),
        (OrderStatus.PLACED, "BOGUS", 400),
    ],
)
def test_invalid_owner_transitions_are_rejected(client, db_session, start, target, expected):
    owner, customer, restaurant, *_ = make_store(db_session)
    order = insert_order(db_session, customer, restaurant, status=start)
    res = client.patch(f"{PREFIX}/orders/{order.id}/status", json={"status": target}, headers=headers(owner))
    assert res.status_code == expected
    db_session.refresh(order)
    assert order.status == start


def test_courier_cannot_skip_or_repeat_delivery_steps(client, db_session):
    owner, customer, restaurant, burger, _ = make_store(db_session)
    courier = _courier(db_session)
    order_id = place_order(client, customer, restaurant, [(burger.id, 1)]).json()["id"]
    for status in ("ACCEPTED", "PREPARING", "READY"):
        client.patch(f"{PREFIX}/orders/{order_id}/status", json={"status": status}, headers=headers(owner))
    aid = client.post(f"{PREFIX}/deliveries/assign/{order_id}", json={"delivery_partner_id": courier.id},
                      headers=headers(owner)).json()["id"]
    path = f"{PREFIX}/deliveries/my/{aid}/status"
    assert client.patch(path, json={"status": "DELIVERED"}, headers=headers(courier)).status_code == 400
    assert client.patch(path, json={"status": "ASSIGNED"}, headers=headers(courier)).status_code == 422
    assert client.patch(path, json={}, headers=headers(courier)).status_code == 422
    assert client.patch(path, json={"status": "OUT_FOR_DELIVERY"}, headers=headers(courier)).status_code == 200
    assert client.patch(path, json={"status": "OUT_FOR_DELIVERY"}, headers=headers(courier)).status_code == 400
    # a delivered order cannot be cancelled
    assert client.patch(path, json={"status": "DELIVERED"}, headers=headers(courier)).status_code == 200
    assert client.post(f"{PREFIX}/orders/my/{order_id}/cancel", headers=headers(customer)).status_code == 400
    assert client.post(f"{PREFIX}/deliveries/assign/{order_id}", json={"delivery_partner_id": courier.id},
                       headers=headers(owner)).status_code == 400


def test_assign_requires_ready_order_and_valid_courier(client, db_session):
    owner, customer, restaurant, *_ = make_store(db_session)
    courier = _courier(db_session)
    not_ready = insert_order(db_session, customer, restaurant, status=OrderStatus.PREPARING)
    assert client.post(f"{PREFIX}/deliveries/assign/{not_ready.id}", json={"delivery_partner_id": courier.id},
                       headers=headers(owner)).status_code == 400
    ready = insert_order(db_session, customer, restaurant, status=OrderStatus.READY)
    assert client.post(f"{PREFIX}/deliveries/assign/{ready.id}", json={"delivery_partner_id": customer.id},
                       headers=headers(owner)).status_code == 404  # not a delivery partner
    assert client.post(f"{PREFIX}/deliveries/assign/{ready.id}", json={"delivery_partner_id": 99999},
                       headers=headers(owner)).status_code == 404


# --------------------------------------------------------------------------- refund workflow

def test_refund_approval_workflow(client, db_session):
    owner, customer, restaurant, burger, _ = make_store(db_session)
    order_id = place_order(client, customer, restaurant, [(burger.id, 2)]).json()["id"]
    ret = f"{PREFIX}/orders/{order_id}/return"

    assert client.post(ret, json={"reason": "too early"}, headers=headers(customer)).status_code == 400  # not delivered
    _deliver(client, owner, _courier(db_session), order_id)
    assert client.post(ret, json={"reason": "  "}, headers=headers(customer)).status_code == 422
    rr = client.post(ret, json={"reason": "cold food"}, headers=headers(customer))
    assert rr.status_code == 201 and rr.json()["status"] == "pending"
    assert client.post(ret, json={"reason": "again"}, headers=headers(customer)).status_code == 409

    pending = client.get(f"{PREFIX}/refunds/pending", headers=headers(owner))
    assert [r["id"] for r in pending.json()] == [rr.json()["id"]] and pending.headers["x-total-count"] == "1"

    done = client.post(f"{PREFIX}/refunds/{rr.json()['id']}/action", json={"action": "approve"}, headers=headers(owner))
    assert done.status_code == 200 and done.json()["status"] == "approved"
    assert client.post(f"{PREFIX}/refunds/{rr.json()['id']}/action", json={"action": "approve"},
                       headers=headers(owner)).status_code == 400  # cannot process twice

    order = client.get(f"{PREFIX}/orders/my/{order_id}", headers=headers(customer)).json()
    assert order["status"] == "REFUNDED" and order["payment_status"] == "refunded"
    ledger = client.get(f"{PREFIX}/orders/{order_id}/payments", headers=headers(customer)).json()
    assert [(e["entry_type"], e["status"]) for e in ledger] == [("payment", "mock_paid"), ("refund", "refunded")]
    assert db_session.query(RefundRecord).filter_by(order_id=order_id).count() == 1
    assert db_session.query(PaymentLedger).filter_by(order_id=order_id).count() == 2


def test_refund_rejection_keeps_order_delivered(client, db_session):
    owner, customer, restaurant, burger, _ = make_store(db_session)
    order_id = place_order(client, customer, restaurant, [(burger.id, 1)]).json()["id"]
    _deliver(client, owner, _courier(db_session), order_id)
    rr = client.post(f"{PREFIX}/orders/{order_id}/return", json={"reason": "meh"}, headers=headers(customer)).json()
    res = client.post(f"{PREFIX}/refunds/{rr['id']}/action", json={"action": "reject"}, headers=headers(owner))
    assert res.json()["status"] == "rejected"
    db_session.expire_all()
    assert db_session.get(Order, order_id).status == OrderStatus.DELIVERED
    assert db_session.query(RefundRecord).count() == 0
    assert client.get(f"{PREFIX}/orders/{order_id}/payments", headers=headers(customer)).json()[0]["status"] == "mock_paid"
    assert client.post(f"{PREFIX}/refunds/{rr['id']}/action", json={"action": "approve"},
                       headers=headers(owner)).status_code == 400  # a rejected request cannot be approved later


# --------------------------------------------------------------------------- reviews / ratings

def test_review_rules_and_exact_rating_aggregate(client, db_session):
    owner, customer, restaurant, burger, _ = make_store(db_session)
    restaurant.avg_rating, restaurant.total_reviews, restaurant.rating_sum = Decimal("4.00"), 2, 8
    db_session.commit()

    undelivered = place_order(client, customer, restaurant, [(burger.id, 1)]).json()["id"]
    assert client.post(f"{PREFIX}/orders/{undelivered}/review", json={"rating": 5}, headers=headers(customer)).status_code == 400
    delivered = insert_order(db_session, customer, restaurant, status=OrderStatus.DELIVERED)
    for bad in (0, 6, "x"):
        assert client.post(f"{PREFIX}/orders/{delivered.id}/review", json={"rating": bad},
                           headers=headers(customer)).status_code == 422
    assert client.post(f"{PREFIX}/orders/{delivered.id}/review", json={"rating": 5}, headers=headers(customer)).status_code == 201
    assert client.post(f"{PREFIX}/orders/{delivered.id}/review", json={"rating": 1}, headers=headers(customer)).status_code == 409

    db_session.refresh(restaurant)
    assert (restaurant.total_reviews, restaurant.rating_sum, restaurant.avg_rating) == (3, 13, Decimal("4.33"))
    shown = client.get(f"{PREFIX}/restaurants/{restaurant.id}").json()
    assert shown["total_reviews"] == 3 and Decimal(shown["avg_rating"]) == Decimal("4.33")


def test_many_sequential_reviews_have_no_rounding_drift(client, db_session):
    owner, customer, restaurant, *_ = make_store(db_session)
    ratings = [5, 4, 4, 3, 5, 1, 2, 5, 4, 3, 3, 4, 5, 2, 4, 1, 5, 5, 3, 4]
    for rating in ratings:
        order = insert_order(db_session, customer, restaurant, status=OrderStatus.DELIVERED)
        assert client.post(f"{PREFIX}/orders/{order.id}/review", json={"rating": rating},
                           headers=headers(customer)).status_code == 201
    db_session.refresh(restaurant)
    assert restaurant.total_reviews == len(ratings) and restaurant.rating_sum == sum(ratings)
    assert restaurant.avg_rating == Decimal(str(round(sum(ratings) / len(ratings), 2)))


def test_review_list_is_paginated_with_total_header(client, db_session):
    owner, customer, restaurant, *_ = make_store(db_session)
    for _ in range(5):
        order = insert_order(db_session, customer, restaurant, status=OrderStatus.DELIVERED)
        client.post(f"{PREFIX}/orders/{order.id}/review", json={"rating": 4}, headers=headers(customer))
    page = client.get(f"{PREFIX}/restaurants/{restaurant.id}/reviews", params={"per_page": 2, "page": 3})
    assert len(page.json()) == 1 and page.headers["x-total-count"] == "5"


def test_menu_price_filter_validation(client, db_session):
    owner, customer, restaurant, *_ = make_store(db_session)
    bad = client.get(f"{PREFIX}/menu-items/restaurant/{restaurant.id}", params={"min_price": 9, "max_price": 1})
    assert bad.status_code == 422
    ok = client.get(f"{PREFIX}/menu-items/restaurant/{restaurant.id}", params={"min_price": 3, "max_price": 5})
    assert [i["name"] for i in ok.json()["items"]] == ["Burger"]
    assert client.post(f"{PREFIX}/menu-items", json={"name": "Huge", "price": "99999999999.00"},
                       headers=headers(owner)).status_code == 422
