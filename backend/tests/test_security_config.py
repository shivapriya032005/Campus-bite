"""Regression tests: production configuration validation, CORS, rate limiting, account approval."""

import pytest
from pydantic import ValidationError

from app.core.config import Settings
from app.core.security import hash_password
from app.models.user import User, UserRole

from .helpers import PREFIX, headers, make_store, make_user

STRONG = "k3Jf9aQ2xLmN7vB4zR8tY1uW6eH0pS5dG3cX9bV2nM4qZ7aT"


def prod(**overrides) -> Settings:
    base = dict(app_env="production", jwt_secret_key=STRONG, mysql_password="a-real-db-pw-93f1",
                cors_origins="https://campusbite.example.com", _env_file=None)
    base.update(overrides)
    return Settings(**base)


# --------------------------------------------------------------------------- JWT / production config

@pytest.mark.parametrize(
    "secret",
    ["development-only-change-me", "replace_with_a_long_random_secret_before_use", "short", "x" * 31, ""],
)
def test_production_rejects_weak_or_default_jwt_secret(secret):
    with pytest.raises(ValidationError):
        prod(jwt_secret_key=secret)


def test_production_rejects_default_db_password_and_missing_cors():
    with pytest.raises(ValidationError):
        prod(mysql_password="change_this_local_password")
    with pytest.raises(ValidationError):
        prod(cors_origins="")


def test_production_accepts_strong_configuration():
    cfg = prod()
    assert cfg.is_production
    assert cfg.cors_origin_list == ["https://campusbite.example.com"]  # no localhost leaks into prod


def test_development_keeps_convenient_defaults():
    cfg = Settings(app_env="development", _env_file=None)
    assert "http://localhost:5173" in cfg.cors_origin_list
    assert "http://127.0.0.1:5173" in cfg.cors_origin_list


def test_cors_wildcard_with_credentials_is_rejected():
    with pytest.raises(ValidationError):
        Settings(app_env="development", cors_origins="*", _env_file=None)


def test_secrets_are_not_exposed_in_settings_repr():
    cfg = prod(openai_api_key="sk-test-secret-value", admin_api_key="A" * 40)
    text = repr(cfg) + str(cfg)
    for secret in (STRONG, "sk-test-secret-value", "a-real-db-pw-93f1", "A" * 40):
        assert secret not in text


def test_cors_headers_follow_configured_origins(client):
    ok = client.options(
        f"{PREFIX}/auth/login",
        headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST"},
    )
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:5173"
    bad = client.options(
        f"{PREFIX}/auth/login",
        headers={"Origin": "https://evil.example.com", "Access-Control-Request-Method": "POST"},
    )
    assert "access-control-allow-origin" not in bad.headers


# --------------------------------------------------------------------------- rate limiting

def _register(client, email, role="customer"):
    return client.post(
        f"{PREFIX}/auth/register",
        json={"email": email, "password": "Pass1234!", "full_name": "T", "role": role},
    )


def test_login_rate_limit_by_ip(client, db_session, monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "rate_limit_login_max", 3)
    monkeypatch.setattr(settings, "rate_limit_login_window_seconds", 600)
    db_session.add(User(email="a@b.edu", password_hash=hash_password("Pass1234!"), role=UserRole.CUSTOMER, full_name="A"))
    db_session.commit()

    codes = [
        client.post(f"{PREFIX}/auth/login", json={"email": "a@b.edu", "password": "wrong-pass"}).status_code
        for _ in range(3)
    ]
    assert codes == [401, 401, 401]
    blocked = client.post(f"{PREFIX}/auth/login", json={"email": "a@b.edu", "password": "Pass1234!"})
    assert blocked.status_code == 429
    assert int(blocked.headers["retry-after"]) >= 1


def test_login_rate_limit_is_per_ip_not_global(client, db_session, monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "rate_limit_login_max", 1)
    monkeypatch.setattr(settings, "trust_proxy_headers", True)
    first = client.post(f"{PREFIX}/auth/login", json={"email": "x@y.edu", "password": "nope-nope"},
                        headers={"X-Forwarded-For": "10.0.0.1"})
    again = client.post(f"{PREFIX}/auth/login", json={"email": "x@y.edu", "password": "nope-nope"},
                        headers={"X-Forwarded-For": "10.0.0.1"})
    other_ip = client.post(f"{PREFIX}/auth/login", json={"email": "x@y.edu", "password": "nope-nope"},
                           headers={"X-Forwarded-For": "10.0.0.2"})
    assert (first.status_code, again.status_code, other_ip.status_code) == (401, 429, 401)


def test_forwarded_header_ignored_unless_proxy_trusted(client, monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "rate_limit_login_max", 1)
    monkeypatch.setattr(settings, "trust_proxy_headers", False)
    codes = [
        client.post(f"{PREFIX}/auth/login", json={"email": "x@y.edu", "password": "nope-nope"},
                    headers={"X-Forwarded-For": f"10.0.0.{i}"}).status_code
        for i in range(3)
    ]
    assert codes == [401, 429, 429]  # spoofed header cannot dodge the limit


def test_registration_rate_limit(client, monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "rate_limit_register_max", 2)
    codes = [_register(client, f"u{i}@campus.edu").status_code for i in range(4)]
    assert codes == [201, 201, 429, 429]


def test_ai_rate_limit_is_per_user(client, db_session, monkeypatch):
    from unittest.mock import MagicMock, patch

    from app.core.config import settings

    monkeypatch.setattr(settings, "rate_limit_ai_max", 2)
    monkeypatch.setattr(settings, "openai_api_key", "sk-test")
    _, alice, *_ = make_store(db_session, "1")
    _, bob, *_ = make_store(db_session, "2")

    fake = MagicMock()
    fake.chat.completions.create.return_value.choices = [MagicMock(message=MagicMock(content="ok"))]
    with patch("openai.OpenAI", return_value=fake):
        alice_codes = [
            client.post(f"{PREFIX}/insights", json={"question": "hi"}, headers=headers(alice)).status_code
            for _ in range(3)
        ]
        bob_code = client.post(f"{PREFIX}/insights", json={"question": "hi"}, headers=headers(bob)).status_code
    assert alice_codes == [200, 200, 429]
    assert bob_code == 200  # another user's quota is independent
    assert fake.chat.completions.create.call_count == 3  # the limited call never reached OpenAI


def test_openai_rate_limit_is_translated_to_429(client, db_session, monkeypatch):
    from unittest.mock import MagicMock, patch

    from app.core.config import settings

    monkeypatch.setattr(settings, "openai_api_key", "sk-test")
    _, customer, *_ = make_store(db_session)

    class RateLimitError(Exception):
        status_code = 429

    fake = MagicMock()
    fake.chat.completions.create.side_effect = RateLimitError("slow down")
    with patch("openai.OpenAI", return_value=fake):
        res = client.post(f"{PREFIX}/insights", json={"question": "hi"}, headers=headers(customer))
    assert res.status_code == 429 and "Retry-After" in res.headers


# --------------------------------------------------------------------------- owner / delivery approval

def test_registration_approval_defaults(client):
    customer = _register(client, "c@campus.edu", "customer").json()
    owner = _register(client, "o@campus.edu", "owner").json()
    courier = _register(client, "d@campus.edu", "delivery").json()
    assert customer["is_approved"] is True
    assert owner["is_approved"] is False
    assert courier["is_approved"] is False


def test_unapproved_owner_blocked_from_management_features(client, db_session):
    owner, customer, restaurant, burger, _ = make_store(db_session, approved=False)
    h = headers(owner)
    blocked = [
        client.get(f"{PREFIX}/orders/restaurant", headers=h),
        client.get(f"{PREFIX}/menu-items/owner/all", headers=h),
        client.post(f"{PREFIX}/menu-items", json={"name": "X", "price": "1.00"}, headers=h),
        client.post(f"{PREFIX}/restaurants", json={"name": "New"}, headers=h),
        client.get(f"{PREFIX}/dashboard/stats", headers=h),
        client.get(f"{PREFIX}/reminders", headers=h),
        client.get(f"{PREFIX}/refunds/pending", headers=h),
        client.get(f"{PREFIX}/deliveries/partners", headers=h),
    ]
    assert [r.status_code for r in blocked] == [403] * len(blocked)
    assert all("pending approval" in r.json()["detail"] for r in blocked)
    # login and identity still work so the UI can explain the situation
    assert client.get(f"{PREFIX}/auth/me", headers=h).json()["is_approved"] is False


def test_unapproved_delivery_partner_cannot_use_deliveries_or_be_assigned(client, db_session):
    from app.models.order import OrderStatus

    from .helpers import insert_order

    owner, customer, restaurant, *_ = make_store(db_session)
    courier = make_user(db_session, "courier@campus.edu", UserRole.DELIVERY, approved=False)
    order = insert_order(db_session, customer, restaurant, status=OrderStatus.READY)

    assert client.get(f"{PREFIX}/deliveries/my", headers=headers(courier)).status_code == 403
    assert courier.id not in [p["id"] for p in client.get(f"{PREFIX}/deliveries/partners", headers=headers(owner)).json()]
    res = client.post(f"{PREFIX}/deliveries/assign/{order.id}", json={"delivery_partner_id": courier.id},
                      headers=headers(owner))
    assert res.status_code == 404
    db_session.refresh(order)
    assert order.status == OrderStatus.READY


def test_admin_approval_flow(client, db_session, monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "admin_api_key", "A" * 40)
    owner = make_user(db_session, "pending@campus.edu", UserRole.OWNER, approved=False)
    admin = {"X-Admin-Key": "A" * 40}

    assert client.get(f"{PREFIX}/restaurants", headers=headers(owner)).status_code == 200
    assert client.post(f"{PREFIX}/restaurants", json={"name": "R"}, headers=headers(owner)).status_code == 403

    assert client.get(f"{PREFIX}/admin/users", params={"approved": "false"}).status_code == 401
    assert client.get(f"{PREFIX}/admin/users", headers={"X-Admin-Key": "wrong"}).status_code == 401
    listed = client.get(f"{PREFIX}/admin/users", params={"approved": "false"}, headers=admin).json()
    assert [u["email"] for u in listed] == ["pending@campus.edu"]

    assert client.post(f"{PREFIX}/admin/users/{owner.id}/approve", headers=admin).json()["is_approved"] is True
    assert client.post(f"{PREFIX}/restaurants", json={"name": "R"}, headers=headers(owner)).status_code == 201
    assert client.post(f"{PREFIX}/admin/users/{owner.id}/revoke", headers=admin).json()["is_approved"] is False
    assert client.post(f"{PREFIX}/menu-items", json={"name": "X", "price": "1"}, headers=headers(owner)).status_code == 403


def test_admin_api_disabled_without_key(client, monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "admin_api_key", None)
    assert client.get(f"{PREFIX}/admin/users", headers={"X-Admin-Key": "anything"}).status_code == 404


def test_existing_and_demo_accounts_stay_approved(db_session):
    """Rows created without an explicit flag (existing/seeded accounts) are approved."""
    user = User(email="legacy@campus.edu", password_hash="x", role=UserRole.OWNER, full_name="Legacy")
    db_session.add(user)
    db_session.commit()
    assert user.is_approved is True


def test_login_email_is_case_insensitive_and_duplicates_are_detected(client, db_session):
    db_session.add(User(email="Mixed.Case@Campus.edu", password_hash=hash_password("Pass1234!"),
                        role=UserRole.CUSTOMER, full_name="Legacy"))
    db_session.commit()
    ok = client.post(f"{PREFIX}/auth/login", json={"email": "mixed.case@campus.edu", "password": "Pass1234!"})
    assert ok.status_code == 200
    dup = _register(client, "MIXED.case@campus.EDU")
    assert dup.status_code == 409


def test_registering_twice_as_owner_cannot_create_two_restaurants(client, db_session):
    owner = make_user(db_session, "solo@campus.edu", UserRole.OWNER)
    first = client.post(f"{PREFIX}/restaurants", json={"name": "One"}, headers=headers(owner))
    second = client.post(f"{PREFIX}/restaurants", json={"name": "Two"}, headers=headers(owner))
    assert (first.status_code, second.status_code) == (201, 409)


def test_overlong_password_is_rejected_not_truncated(client):
    res = _register(client, "long@campus.edu")
    assert res.status_code == 201
    too_long = client.post(
        f"{PREFIX}/auth/register",
        json={"email": "long2@campus.edu", "password": "p" * 73, "full_name": "T", "role": "customer"},
    )
    assert too_long.status_code == 422
