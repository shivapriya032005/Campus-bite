"""Regression tests: reminder de-duplication, resolution, dismissal and scheduler single-run guarantees."""

from datetime import timedelta

from app.core.timeutil import utcnow
from app.models.order import OrderStatus
from app.models.reminder_log import ReminderLog, ReminderStatus
from app.services.reminders import sync_reminders
from app.services.scheduler_lock import release_lease, try_acquire_lease
from app.tasks.reminders import check_stale_orders

from .helpers import PREFIX, headers, insert_order, make_store


def _reminders(db, **filters):
    return db.query(ReminderLog).filter_by(**filters).order_by(ReminderLog.id).all()


# --------------------------------------------------------------------------- generation / dedup

def test_only_stale_placed_and_accepted_orders_get_reminders(db_session):
    owner, customer, restaurant, *_ = make_store(db_session)
    stale_placed = insert_order(db_session, customer, restaurant, OrderStatus.PLACED, age_minutes=20)
    stale_accepted = insert_order(db_session, customer, restaurant, OrderStatus.ACCEPTED, age_minutes=30)
    insert_order(db_session, customer, restaurant, OrderStatus.PLACED, age_minutes=5)       # too fresh
    insert_order(db_session, customer, restaurant, OrderStatus.PREPARING, age_minutes=60)   # wrong status
    insert_order(db_session, customer, restaurant, OrderStatus.DELIVERED, age_minutes=60)

    created = sync_reminders(db_session)
    db_session.commit()
    assert {r.order_id for r in created} == {stale_placed.id, stale_accepted.id}
    assert all("15 minutes" in r.message for r in created)


def test_sync_is_idempotent(db_session):
    owner, customer, restaurant, *_ = make_store(db_session)
    insert_order(db_session, customer, restaurant, OrderStatus.PLACED, age_minutes=20)
    assert len(sync_reminders(db_session)) == 1
    db_session.commit()
    for _ in range(3):
        assert sync_reminders(db_session) == []
        db_session.commit()
    assert db_session.query(ReminderLog).count() == 1


def test_scheduler_and_api_endpoint_do_not_duplicate_each_other(client, real_client, real_db, real_session_factory):
    owner, customer, restaurant, *_ = make_store(real_db)
    order = insert_order(real_db, customer, restaurant, OrderStatus.PLACED, age_minutes=20)

    assert check_stale_orders(real_session_factory) == 1                       # scheduler run
    manual = real_client.post(f"{PREFIX}/reminders/generate", headers=headers(owner))  # manual trigger
    assert manual.status_code == 200 and manual.json() == []
    assert real_db.query(ReminderLog).filter_by(order_id=order.id).count() == 1


def test_accepted_stage_gets_its_own_reminder_and_history_is_kept(db_session):
    owner, customer, restaurant, *_ = make_store(db_session)
    order = insert_order(db_session, customer, restaurant, OrderStatus.PLACED, age_minutes=20)
    sync_reminders(db_session)
    db_session.commit()

    order.status = OrderStatus.ACCEPTED
    order.updated_at = utcnow() - timedelta(minutes=20)  # accepted, then stale again
    db_session.commit()
    created = sync_reminders(db_session)
    db_session.commit()

    assert [r.trigger_status for r in created] == ["ACCEPTED"]
    rows = _reminders(db_session, order_id=order.id)
    assert [(r.trigger_status, r.status) for r in rows] == [
        ("PLACED", ReminderStatus.RESOLVED),  # history preserved, not deleted
        ("ACCEPTED", ReminderStatus.ACTIVE),
    ]


# --------------------------------------------------------------------------- resolution

def test_reminder_resolved_when_owner_advances_order(client, db_session):
    owner, customer, restaurant, *_ = make_store(db_session)
    order = insert_order(db_session, customer, restaurant, OrderStatus.PLACED, age_minutes=20)
    sync_reminders(db_session)
    db_session.commit()

    res = client.patch(f"{PREFIX}/orders/{order.id}/status", json={"status": "ACCEPTED"}, headers=headers(owner))
    assert res.status_code == 200
    reminder = _reminders(db_session, order_id=order.id)[0]
    db_session.refresh(reminder)
    assert reminder.status == ReminderStatus.RESOLVED and reminder.resolved_at is not None
    assert client.get(f"{PREFIX}/reminders", headers=headers(owner)).json() == []  # default: active only
    history = client.get(f"{PREFIX}/reminders", params={"status": "all"}, headers=headers(owner)).json()
    assert [r["status"] for r in history] == ["RESOLVED"]


def test_reminder_resolved_when_customer_cancels(client, db_session):
    owner, customer, restaurant, *_ = make_store(db_session)
    order = insert_order(db_session, customer, restaurant, OrderStatus.PLACED, age_minutes=20)
    sync_reminders(db_session)
    db_session.commit()
    assert client.post(f"{PREFIX}/orders/my/{order.id}/cancel", headers=headers(customer)).status_code == 200
    reminder = _reminders(db_session, order_id=order.id)[0]
    db_session.refresh(reminder)
    assert reminder.status == ReminderStatus.RESOLVED


def test_sync_resolves_reminders_for_orders_changed_outside_the_api(db_session):
    owner, customer, restaurant, *_ = make_store(db_session)
    order = insert_order(db_session, customer, restaurant, OrderStatus.ACCEPTED, age_minutes=20)
    sync_reminders(db_session)
    db_session.commit()
    order.status = OrderStatus.DELIVERED
    db_session.commit()
    sync_reminders(db_session)
    db_session.commit()
    db_session.expire_all()
    assert _reminders(db_session, order_id=order.id)[0].status == ReminderStatus.RESOLVED


# --------------------------------------------------------------------------- dismissal

def test_owner_can_dismiss_and_dismissed_reminder_is_not_regenerated(client, db_session):
    owner, customer, restaurant, *_ = make_store(db_session)
    order = insert_order(db_session, customer, restaurant, OrderStatus.PLACED, age_minutes=20)
    sync_reminders(db_session)
    db_session.commit()
    reminder_id = _reminders(db_session, order_id=order.id)[0].id

    res = client.post(f"{PREFIX}/reminders/{reminder_id}/dismiss", headers=headers(owner))
    assert res.status_code == 200 and res.json()["status"] == "DISMISSED"
    assert res.json()["dismissed_at"] is not None

    assert client.post(f"{PREFIX}/reminders/{reminder_id}/dismiss", headers=headers(owner)).status_code == 409
    assert client.post(f"{PREFIX}/reminders/generate", headers=headers(owner)).json() == []
    assert db_session.query(ReminderLog).count() == 1
    assert client.get(f"{PREFIX}/reminders", headers=headers(owner)).json() == []
    kept = client.get(f"{PREFIX}/reminders", params={"status": "dismissed"}, headers=headers(owner)).json()
    assert [r["id"] for r in kept] == [reminder_id]


def test_owner_cannot_dismiss_other_restaurants_reminder(client, db_session):
    owner, customer, restaurant, *_ = make_store(db_session, "1")
    other_owner, *_ = make_store(db_session, "2")
    insert_order(db_session, customer, restaurant, OrderStatus.PLACED, age_minutes=20)
    sync_reminders(db_session)
    db_session.commit()
    reminder_id = db_session.query(ReminderLog).one().id

    assert client.post(f"{PREFIX}/reminders/{reminder_id}/dismiss", headers=headers(other_owner)).status_code == 404
    assert client.get(f"{PREFIX}/reminders", headers=headers(other_owner)).json() == []
    assert db_session.query(ReminderLog).one().status == ReminderStatus.ACTIVE


def test_customer_cannot_use_reminder_endpoints(client, db_session):
    owner, customer, *_ = make_store(db_session)
    assert client.get(f"{PREFIX}/reminders", headers=headers(customer)).status_code == 403
    assert client.post(f"{PREFIX}/reminders/1/dismiss", headers=headers(customer)).status_code == 403


# --------------------------------------------------------------------------- scheduler single-run

def test_lease_allows_only_one_holder(db_session):
    ttl = timedelta(minutes=5)
    assert try_acquire_lease(db_session, "job", ttl, owner="worker-1") is True
    assert try_acquire_lease(db_session, "job", ttl, owner="worker-2") is False  # held by someone else
    assert try_acquire_lease(db_session, "job", ttl, owner="worker-1") is True   # holder renews
    release_lease(db_session, "job", owner="worker-1")
    assert try_acquire_lease(db_session, "job", ttl, owner="worker-2") is True   # free after release


def test_expired_lease_can_be_taken_over(db_session):
    assert try_acquire_lease(db_session, "job", timedelta(seconds=-1), owner="dead-worker") is True
    assert try_acquire_lease(db_session, "job", timedelta(minutes=5), owner="live-worker") is True


def test_second_scheduler_instance_skips_the_cycle(real_db, real_session_factory):
    owner, customer, restaurant, *_ = make_store(real_db)
    insert_order(real_db, customer, restaurant, OrderStatus.PLACED, age_minutes=20)

    assert try_acquire_lease(real_db, "stale_order_reminders", timedelta(minutes=4), owner="another-instance")
    assert check_stale_orders(real_session_factory) is None          # skipped: lease held elsewhere
    assert real_db.query(ReminderLog).count() == 0

    release_lease(real_db, "stale_order_reminders", owner="another-instance")
    assert check_stale_orders(real_session_factory) == 1             # runs once the lease is free
    assert check_stale_orders(real_session_factory) == 0             # same instance, nothing new
    assert real_db.query(ReminderLog).count() == 1


def test_api_starts_scheduler_only_when_enabled(monkeypatch):
    from fastapi.testclient import TestClient

    import app.main as main_module
    from app.core.config import settings

    started = []

    class FakeScheduler:
        def start(self):
            started.append("start")

        def shutdown(self, wait=False):
            started.append("shutdown")

    monkeypatch.setattr(main_module, "build_background_scheduler", lambda: FakeScheduler())

    monkeypatch.setattr(settings, "scheduler_enabled", False)
    with TestClient(main_module.app):
        pass
    assert started == []

    monkeypatch.setattr(settings, "scheduler_enabled", True)
    with TestClient(main_module.app):
        pass
    assert started == ["start", "shutdown"]


def test_scheduler_registers_expected_jobs():
    from app.scheduler import build_background_scheduler

    scheduler = build_background_scheduler()
    assert {job.id for job in scheduler.get_jobs()} == {"stale_order_check", "purge_rate_limits"}
    assert all(job.max_instances == 1 for job in scheduler.get_jobs())
