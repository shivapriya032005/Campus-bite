"""Database seed script for demo data across all three user roles."""

from decimal import Decimal
import uuid
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.delivery_assignment import DeliveryAssignment, DeliveryStatus
from app.models.menu_item import MenuItem
from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem
from app.models.payment_ledger import PaymentEntryType, PaymentLedger, PaymentStatus
from app.models.restaurant import Restaurant
from app.models.review import Review
from app.models.user import User, UserRole


def seed():
    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(User).filter(User.email == "student@campus.edu").first():
            print("Database already contains seed data. Skipping.")
            return

        print("Seeding database...")

        # 1. Users
        student = User(
            email="student@campus.edu",
            password_hash=hash_password("Student1234!"),
            role=UserRole.CUSTOMER,
            full_name="Alex Rivera",
            phone="+1 555 0192",
            address="North Quad Dorm, Hall C, Room 314",
        )
        owner = User(
            email="owner@campus.edu",
            password_hash=hash_password("Owner1234!"),
            role=UserRole.OWNER,
            full_name="Chef Marco Rossi",
            phone="+1 555 0144",
            address="Campus Center Food Court",
        )
        courier = User(
            email="courier@campus.edu",
            password_hash=hash_password("Courier1234!"),
            role=UserRole.DELIVERY,
            full_name="Sam Taylor",
            phone="+1 555 0188",
            address="Student Center Couriers Hub",
        )
        db.add_all([student, owner, courier])
        db.flush()

        # 2. Restaurant
        bistro = Restaurant(
            owner_id=owner.id,
            name="The Campus Bistro & Grill",
            description="Handcrafted artisanal burgers, wholesome quinoa bowls, wood-fired flatbreads, and freshly brewed coffees.",
            cuisine_type="American & Healthy Bowls",
            address="Student Union Plaza, 1st Floor",
            phone="+1 555 0144",
            image_url="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80",
            avg_rating=Decimal("4.85"),
            total_reviews=1,
            is_active=True,
        )
        db.add(bistro)
        db.flush()

        # 3. Menu Items
        items = [
            MenuItem(
                restaurant_id=bistro.id,
                name="Truffle Mushroom Angus Burger",
                description="Grass-fed beef, sautéed wild mushrooms, Swiss cheese, and black truffle aioli on a toasted brioche.",
                price=Decimal("12.50"),
                category="Burgers",
                image_url="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
                is_available=True,
            ),
            MenuItem(
                restaurant_id=bistro.id,
                name="Crispy Buttermilk Chicken Sandwich",
                description="Pickle-brined chicken breast, spicy coleslaw, and honey chipotle glaze.",
                price=Decimal("10.99"),
                category="Burgers",
                image_url="https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=800&q=80",
                is_available=True,
            ),
            MenuItem(
                restaurant_id=bistro.id,
                name="Mediterranean Quinoa Power Bowl",
                description="Organic quinoa, crisp cucumbers, kalamata olives, cherry tomatoes, hummus, and tahini dressing.",
                price=Decimal("11.00"),
                category="Bowls",
                image_url="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80",
                is_available=True,
            ),
            MenuItem(
                restaurant_id=bistro.id,
                name="Smoked Paprika Sweet Potato Fries",
                description="Hand-cut sweet potato fries served with roasted garlic dipping sauce.",
                price=Decimal("5.50"),
                category="Sides",
                image_url="https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=800&q=80",
                is_available=True,
            ),
            MenuItem(
                restaurant_id=bistro.id,
                name="Cold Brew Iced Coffee",
                description="Single-origin Colombian brew steeped for 18 hours with oat milk.",
                price=Decimal("4.25"),
                category="Beverages",
                image_url="https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=800&q=80",
                is_available=True,
            ),
        ]
        db.add_all(items)
        db.flush()

        # 4. Past Delivered Order with Review
        past_order = Order(
            customer_id=student.id,
            restaurant_id=bistro.id,
            status=OrderStatus.DELIVERED,
            total_amount=Decimal("16.75"),
            delivery_address="North Quad Dorm, Hall C, Room 314",
            special_instructions="Ring doorbell upon delivery",
        )
        db.add(past_order)
        db.flush()

        db.add_all([
            OrderItem(
                order_id=past_order.id,
                menu_item_id=items[0].id,
                item_name=items[0].name,
                unit_price=items[0].price,
                quantity=1,
                subtotal=items[0].price,
            ),
            OrderItem(
                order_id=past_order.id,
                menu_item_id=items[4].id,
                item_name=items[4].name,
                unit_price=items[4].price,
                quantity=1,
                subtotal=items[4].price,
            ),
            PaymentLedger(
                order_id=past_order.id,
                entry_type=PaymentEntryType.PAYMENT,
                amount=Decimal("16.75"),
                status=PaymentStatus.MOCK_PAID,
                reference_id=f"PAY-{uuid.uuid4().hex[:12].upper()}",
            ),
            DeliveryAssignment(
                order_id=past_order.id,
                delivery_partner_id=courier.id,
                status=DeliveryStatus.DELIVERED,
            ),
            Review(
                order_id=past_order.id,
                customer_id=student.id,
                restaurant_id=bistro.id,
                rating=5,
                comment="The truffle burger was absolutely phenomenal! Delivered hot in under 15 minutes.",
            ),
        ])

        # 5. Active Order ready for delivery
        active_order = Order(
            customer_id=student.id,
            restaurant_id=bistro.id,
            status=OrderStatus.READY,
            total_amount=Decimal("16.50"),
            delivery_address="North Quad Dorm, Hall C, Room 314",
            special_instructions="Leave outside door",
        )
        db.add(active_order)
        db.flush()

        db.add_all([
            OrderItem(
                order_id=active_order.id,
                menu_item_id=items[1].id,
                item_name=items[1].name,
                unit_price=items[1].price,
                quantity=1,
                subtotal=items[1].price,
            ),
            OrderItem(
                order_id=active_order.id,
                menu_item_id=items[3].id,
                item_name=items[3].name,
                unit_price=items[3].price,
                quantity=1,
                subtotal=items[3].price,
            ),
            PaymentLedger(
                order_id=active_order.id,
                entry_type=PaymentEntryType.PAYMENT,
                amount=Decimal("16.50"),
                status=PaymentStatus.MOCK_PAID,
                reference_id=f"PAY-{uuid.uuid4().hex[:12].upper()}",
            ),
        ])

        db.commit()
        print("Demo seed completed successfully!")
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
