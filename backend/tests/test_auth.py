"""Tests for authentication and role authorization."""

from app.core.security import hash_password, verify_password
from app.models.user import User, UserRole


def test_password_hashing():
    pwd = "StrongPassword123!"
    hashed = hash_password(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False


def test_customer_registration_success(client):
    payload = {
        "email": "student@campus.edu",
        "password": "Password123!",
        "full_name": "Student Alex",
        "role": "customer",
        "phone": "+1234567890",
        "address": "Dorm Hall A",
    }
    response = client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "student@campus.edu"
    assert data["role"] == "customer"
    assert "id" in data


def test_duplicate_registration_fails(client):
    payload = {
        "email": "duplicate@campus.edu",
        "password": "Password123!",
        "full_name": "Dupe User",
        "role": "customer",
    }
    res1 = client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 409
    assert "already exists" in res2.json()["detail"]


def test_login_success_and_me_endpoint(client):
    reg_payload = {
        "email": "owner@campus.edu",
        "password": "OwnerPassword123!",
        "full_name": "Chef Mario",
        "role": "owner",
    }
    client.post("/api/v1/auth/register", json=reg_payload)

    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "owner@campus.edu", "password": "OwnerPassword123!"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    assert token is not None

    # Test /auth/me
    me_res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    user_data = me_res.json()
    assert user_data["email"] == "owner@campus.edu"
    assert user_data["role"] == "owner"


def test_login_invalid_password_fails(client):
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "nonexistent@campus.edu", "password": "wrong"},
    )
    assert res.status_code == 401


def test_role_authorization_restriction(client, db_session, auth_headers):
    # Customer user
    customer = User(
        email="customer1@campus.edu",
        password_hash=hash_password("Pass1234!"),
        role=UserRole.CUSTOMER,
        full_name="Customer User",
    )
    db_session.add(customer)
    db_session.commit()
    db_session.refresh(customer)

    # Attempt to call an owner-only endpoint
    headers = auth_headers(customer.id, "customer")
    response = client.get("/api/v1/dashboard/stats", headers=headers)
    assert response.status_code == 403
    assert "permission" in response.json()["detail"].lower()

