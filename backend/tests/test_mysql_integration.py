"""MySQL integration tests (real concurrency, enum labels, migrations).

Skipped unless TEST_MYSQL_URL points at a DISPOSABLE MySQL database, e.g.

    TEST_MYSQL_URL="mysql+pymysql://root@127.0.0.1:3307/campusbite_test?charset=utf8mb4"

The schema is dropped and rebuilt with Alembic, so never point this at real data.
"""

import os
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from decimal import Decimal
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.core.timeutil import utcnow
from app.db.session import get_db
from app.main import app
from app.models.order import Order, OrderStatus
from app.models.payment_ledger import PaymentEntryType, PaymentLedger
from app.models.reminder_log import ReminderLog
from app.models.restaurant import Restaurant
from app.models.review import Review
from app.models.user import UserRole
from app.services.rate_limit import enforce_rate_limit
from app.services.reminders import sync_reminders_and_commit
from app.services.scheduler_lock import try_acquire_lease
from app.tasks.reminders import check_stale_orders

from .helpers import PREFIX, headers, insert_order, make_store, make_user, place_order

MYSQL_URL = os.environ.get("TEST_MYSQL_URL")
pytestmark = pytest.mark.skipif(not MYSQL_URL, reason="TEST_MYSQL_URL not set")

BACKEND_DIR = Path(__file__).resolve().parent.parent


def _alembic(action: str, revision: str, url: str) -> None:
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    original = settings.database_url_override
    settings.database_url_override = url
    try:
        getattr(command, action)(cfg, revision)
    finally:
        settings.database_url_override = original


def _reset_database(url: str) -> None:
    engine = create_engine(url)
    with engine.begin() as conn:
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 0"))
        for (table,) in conn.execute(text("SHOW TABLES")).fetchall():
            conn.execute(text(f"DROP TABLE IF EXISTS `{table}`"))
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 1"))
    engine.dispose()


@pytest.fixture
def mysql(monkeypatch):
    monkeypatch.setattr(settings, "scheduler_enabled", False)
    _reset_database(MYSQL_URL)
    _alembic("upgrade", "head", MYSQL_URL)
    engine = create_engine(MYSQL_URL, pool_size=20, max_overflow=20, pool_pre_ping=True)
    factory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    def override_get_db():
        session = factory()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    yield factory
    app.dependency_overrides.clear()
    engine.dispose()


def _parallel(n, fn):
    barrier = threading.Barrier(n)

    def run(i):
        barrier.wait()
        try:
            return fn(i)
        except HTTPException as exc:
            return exc

    with ThreadPoolExecutor(max_workers=n) as pool:
        return list(pool.map(run, range(n)))


# --------------------------------------------------------------------------- migrations / enums

def test_migrations_roundtrip_on_mysql():
    _reset_database(MYSQL_URL)
    _alembic("upgrade", "head", MYSQL_URL)
    _alembic("downgrade", "base", MYSQL_URL)
    _alembic("upgrade", "head", MYSQL_URL)
    engine = create_engine(MYSQL_URL)
    with engine.connect() as conn:
        tables = {r[0] for r in conn.execute(text("SHOW TABLES"))}
        assert {"rate_limit_counters", "scheduler_leases", "reminder_logs"} <= tables
        indexes = {(r[2], r[4]) for r in conn.execute(text("SHOW INDEX FROM orders"))}
    assert ("ix_orders_status_updated_at", "status") in indexes
    assert ("ix_orders_restaurant_created", "restaurant_id") in indexes
    engine.dispose()


def test_full_flow_through_real_mysql_enums(mysql):
    """Registers, logs in (bcrypt), orders, cancels: enum labels must round-trip on MySQL."""
    with TestClient(app) as client:
        for role in ("customer", "owner"):
            res = client.post(f"{PREFIX}/auth/register",
                              json={"email": f"{role}@campus.edu", "password": "Pass1234!", "full_name": "T", "role": role})
            assert res.status_code == 201, res.text
        token = client.post(f"{PREFIX}/auth/login", json={"email": "customer@campus.edu", "password": "Pass1234!"}).json()
        me = client.get(f"{PREFIX}/auth/me", headers={"Authorization": f"Bearer {token['access_token']}"})
        assert me.status_code == 200 and me.json()["role"] == "customer"

    db = mysql()
    owner, customer, restaurant, burger, _ = make_store(db, "x")
    with TestClient(app) as client:
        order_id = place_order(client, customer, restaurant, [(burger.id, 2), (burger.id, 1)]).json()["id"]
        assert client.post(f"{PREFIX}/orders/my/{order_id}/cancel", headers=headers(customer)).json()["payment_status"] == "voided"
        ledger = client.get(f"{PREFIX}/orders/{order_id}/payments", headers=headers(customer)).json()
        assert [e["status"] for e in ledger] == ["mock_paid", "voided"]
        listing = client.get(f"{PREFIX}/orders/my", params={"date_from": "2000-01-01"}, headers=headers(customer))
        assert listing.status_code == 200 and listing.json()["total"] == 1
    db.close()


# --------------------------------------------------------------------------- concurrency

def test_concurrent_reviews_never_lose_rating_updates(mysql):
    db = mysql()
    owner, _, restaurant, *_ = make_store(db)
    n = 16
    customers = [make_user(db, f"c{i}@campus.edu", UserRole.CUSTOMER) for i in range(n)]
    orders = [insert_order(db, c, restaurant, OrderStatus.DELIVERED) for c in customers]
    ratings = [1 + (i % 5) for i in range(n)]

    def review(i):
        with TestClient(app) as client:
            return client.post(f"{PREFIX}/orders/{orders[i].id}/review", json={"rating": ratings[i]},
                               headers=headers(customers[i])).status_code

    codes = _parallel(n, review)
    assert codes == [201] * n
    db.rollback()
    db.expire_all()
    fresh = db.get(Restaurant, restaurant.id)
    assert fresh.total_reviews == n
    assert fresh.rating_sum == sum(ratings)
    assert fresh.avg_rating == Decimal(str(round(sum(ratings) / n, 2)))
    assert db.query(Review).filter_by(restaurant_id=restaurant.id).count() == n
    db.close()


def test_concurrent_duplicate_review_and_return_are_rejected(mysql):
    db = mysql()
    owner, customer, restaurant, *_ = make_store(db)
    order = insert_order(db, customer, restaurant, OrderStatus.DELIVERED)

    def attempt(i):
        with TestClient(app) as client:
            review = client.post(f"{PREFIX}/orders/{order.id}/review", json={"rating": 5}, headers=headers(customer)).status_code
            ret = client.post(f"{PREFIX}/orders/{order.id}/return", json={"reason": "x"}, headers=headers(customer)).status_code
            return review, ret

    results = _parallel(6, attempt)
    assert sorted(r[0] for r in results).count(201) == 1 and all(r[0] in (201, 409) for r in results)
    assert sorted(r[1] for r in results).count(201) == 1 and all(r[1] in (201, 409) for r in results)
    db.rollback()
    db.expire_all()
    assert db.get(Restaurant, restaurant.id).total_reviews == 1
    db.close()


def test_rate_limit_counter_is_atomic_across_workers(mysql):
    def hit(i):
        session = mysql()
        try:
            enforce_rate_limit(session, "login:203.0.113.9", 10, 3600)
            return "ok"
        except HTTPException as exc:
            return exc.status_code
        finally:
            session.close()

    results = _parallel(30, hit)
    assert results.count("ok") == 10 and results.count(429) == 20


def test_only_one_scheduler_instance_wins_the_lease(mysql):
    def grab(i):
        session = mysql()
        try:
            return try_acquire_lease(session, "stale_order_reminders", timedelta(minutes=4), owner=f"worker-{i}")
        finally:
            session.close()

    assert _parallel(12, grab).count(True) == 1


def test_concurrent_reminder_generation_creates_each_reminder_once(mysql):
    db = mysql()
    owner, customer, restaurant, *_ = make_store(db)
    orders = [insert_order(db, customer, restaurant, OrderStatus.PLACED, age_minutes=30) for _ in range(5)]

    def run(i):
        session = mysql()
        try:
            return len(sync_reminders_and_commit(session))
        finally:
            session.close()

    results = _parallel(8, run)
    assert all(isinstance(r, int) for r in results), results
    assert sum(results) == 5
    db.rollback()  # end the old REPEATABLE READ snapshot
    assert db.query(ReminderLog).count() == 5
    assert check_stale_orders(mysql) == 0
    db.close()


def test_cancel_racing_with_accept_leaves_a_consistent_order(mysql):
    db = mysql()
    owner, customer, restaurant, burger, _ = make_store(db)
    outcomes = set()
    for _ in range(6):
        order_id = place_order(TestClient(app), customer, restaurant, [(burger.id, 1)]).json()["id"]

        def act(i):
            with TestClient(app) as client:
                if i == 0:
                    return client.post(f"{PREFIX}/orders/my/{order_id}/cancel", headers=headers(customer)).status_code
                return client.patch(f"{PREFIX}/orders/{order_id}/status", json={"status": "ACCEPTED"},
                                    headers=headers(owner)).status_code

        _parallel(2, act)
        db.rollback()  # end the old REPEATABLE READ snapshot so we see the other sessions' commits
        db.expire_all()
        order = db.get(Order, order_id)
        voids = db.query(PaymentLedger).filter_by(order_id=order_id, entry_type=PaymentEntryType.VOID).count()
        assert (order.status, voids) in {(OrderStatus.CANCELLED, 1), (OrderStatus.ACCEPTED, 0)}, (order.status, voids)
        outcomes.add(order.status)
    db.close()
