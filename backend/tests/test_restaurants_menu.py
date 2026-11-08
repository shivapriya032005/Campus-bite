"""Tests for restaurant ownership, menu items, and availability toggling."""

from decimal import Decimal
from app.core.security import hash_password
from app.models.restaurant import Restaurant
from app.models.user import User, UserRole


def test_restaurant_creation_and_ownership(client, db_session, auth_headers):
    owner = User(
        email="chef@campus.edu",
        password_hash=hash_password("Pass1234!"),
        role=UserRole.OWNER,
        full_name="Chef Luigi",
    )
    db_session.add(owner)
    db_session.commit()
    db_session.refresh(owner)

    headers = auth_headers(owner.id, "owner")
    payload = {
        "name": "Luigi Pasta Bar",
        "description": "Authentic campus pasta & garlic bread",
        "cuisine_type": "Italian",
        "address": "Student Union, Level 2",
        "phone": "+1 555 4321",
    }
    response = client.post("/api/v1/restaurants", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Luigi Pasta Bar"
    assert data["owner_id"] == owner.id

    # Duplicate restaurant for same owner should fail
    dup_res = client.post("/api/v1/restaurants", json=payload, headers=headers)
    assert dup_res.status_code == 409


def test_menu_item_crud_and_availability(client, db_session, auth_headers):
    owner = User(
        email="burgerchef@campus.edu",
        password_hash=hash_password("Pass1234!"),
        role=UserRole.OWNER,
        full_name="Chef Bob",
    )
    db_session.add(owner)
    db_session.commit()
    db_session.refresh(owner)

    rest = Restaurant(
        owner_id=owner.id,
        name="Bob's Burgers",
        cuisine_type="American",
    )
    db_session.add(rest)
    db_session.commit()
    db_session.refresh(rest)

    headers = auth_headers(owner.id, "owner")

    # 1. Create item
    item_payload = {
        "name": "Campus Bacon Cheeseburger",
        "description": "Double patty, sharp cheddar",
        "price": 11.50,
        "category": "Burgers",
        "is_available": True,
    }
    res = client.post("/api/v1/menu-items", json=item_payload, headers=headers)
    assert res.status_code == 201
    item_id = res.json()["id"]

    # 2. Public view restaurant menu
    public_res = client.get(f"/api/v1/menu-items/restaurant/{rest.id}")
    assert public_res.status_code == 200
    assert len(public_res.json()["items"]) == 1

    # 3. Toggle availability
    put_res = client.put(
        f"/api/v1/menu-items/{item_id}",
        json={"is_available": False},
        headers=headers,
    )
    assert put_res.status_code == 200
    assert put_res.json()["is_available"] is False

    # 4. Public list should now exclude unavailable items
    public_res2 = client.get(f"/api/v1/menu-items/restaurant/{rest.id}")
    assert len(public_res2.json()["items"]) == 0

    # 5. Owner list should still see all items
    owner_all = client.get("/api/v1/menu-items/owner/all", headers=headers)
    assert len(owner_all.json()["items"]) == 1

    # 6. Delete item
    del_res = client.delete(f"/api/v1/menu-items/{item_id}", headers=headers)
    assert del_res.status_code == 204

