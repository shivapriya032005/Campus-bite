"""Database seed script for demo data across all three user roles and diverse campus eateries."""

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
        print("Auditing & expanding campus seed data...")

        # 1. Base Users (Alex Rivera, Chef Marco Rossi, Sam Taylor)
        student = db.query(User).filter(User.email == "student@campus.edu").first()
        if not student:
            student = User(
                email="student@campus.edu",
                password_hash=hash_password("Student1234!"),
                role=UserRole.CUSTOMER,
                full_name="Alex Rivera",
                phone="+1 555 0192",
                address="North Quad Dorm, Hall C, Room 314",
            )
            db.add(student)

        owner = db.query(User).filter(User.email == "owner@campus.edu").first()
        if not owner:
            owner = User(
                email="owner@campus.edu",
                password_hash=hash_password("Owner1234!"),
                role=UserRole.OWNER,
                full_name="Chef Marco Rossi",
                phone="+1 555 0144",
                address="Campus Center Food Court",
            )
            db.add(owner)

        courier = db.query(User).filter(User.email == "courier@campus.edu").first()
        if not courier:
            courier = User(
                email="courier@campus.edu",
                password_hash=hash_password("Courier1234!"),
                role=UserRole.DELIVERY,
                full_name="Sam Taylor",
                phone="+1 555 0188",
                address="Student Center Couriers Hub",
            )
            db.add(courier)

        db.flush()

        # 2. Update existing Bistro image_url to local reliable asset if needed
        bistro = db.query(Restaurant).filter(Restaurant.owner_id == owner.id).first()
        if not bistro:
            bistro = Restaurant(
                owner_id=owner.id,
                name="The Campus Bistro & Grill",
                description="Handcrafted artisanal burgers, wholesome quinoa bowls, wood-fired flatbreads, and freshly brewed coffees.",
                cuisine_type="American & Healthy Bowls",
                address="Student Union Plaza, 1st Floor",
                phone="+1 555 0144",
                image_url="/assets/restaurants/bistro.jpg",
                avg_rating=Decimal("4.85"),
                total_reviews=1,
                is_active=True,
            )
            db.add(bistro)
            db.flush()
        else:
            bistro.image_url = "/assets/restaurants/bistro.jpg"

        # Update Bistro items to local reliable dish assets
        bistro_items = db.query(MenuItem).filter(MenuItem.restaurant_id == bistro.id).all()
        dish_asset_map = {
            "Truffle Mushroom Angus Burger": "/assets/dishes/truffle-burger.jpg",
            "Crispy Buttermilk Chicken Sandwich": "/assets/dishes/crispy-chicken.jpg",
            "Mediterranean Quinoa Power Bowl": "/assets/dishes/acai-bowl.jpg",
            "Smoked Paprika Sweet Potato Fries": "/assets/dishes/sweet-potato-fries.jpg",
            "Cold Brew Iced Coffee": "/assets/dishes/cold-brew.jpg",
        }
        for it in bistro_items:
            if it.name in dish_asset_map:
                it.image_url = dish_asset_map[it.name]

        # 3. Additional Diverse Campus Restaurants & Cuisines
        additional_eateries = [
            {
                "email": "owner_pizza@campus.edu",
                "name": "Chef Giovanni Romano",
                "phone": "+1 555 0201",
                "rest_name": "Piazza Napoli Wood-Fired Pizzeria",
                "desc": "Traditional hand-stretched sourdough pizzas baked in an authentic 800-degree stone hearth oven.",
                "cuisine": "Pizza & Italian",
                "address": "Campus Commons, West Courtyard",
                "image": "/assets/restaurants/pizza-hub.jpg",
                "rating": Decimal("4.90"),
                "reviews": 38,
                "dishes": [
                    {
                        "name": "Margherita Di Bufala",
                        "desc": "San Marzano tomatoes, fresh buffalo mozzarella, fragrant sweet basil, and extra virgin olive oil.",
                        "price": Decimal("14.50"),
                        "category": "Pizza",
                        "image": "/assets/dishes/margherita-pizza.jpg",
                    },
                    {
                        "name": "Double Pepperoni Hot Honey Crisp",
                        "desc": "Cupped artisan pepperoni, spicy tomato sauce, whole-milk mozzarella, drizzled with spicy habanero honey.",
                        "price": Decimal("16.25"),
                        "category": "Pizza",
                        "image": "/assets/dishes/pepperoni-pizza.jpg",
                    },
                    {
                        "name": "Truffle & Herb Garlic Knots",
                        "desc": "Warm knotted pizza dough brushed with roasted garlic butter, grated Pecorino Romano, and Italian parsley.",
                        "price": Decimal("6.50"),
                        "category": "Starters",
                        "image": "/assets/dishes/garlic-bread.jpg",
                    },
                ],
            },
            {
                "email": "owner_biryani@campus.edu",
                "name": "Nizamuddin Khan",
                "phone": "+1 555 0202",
                "rest_name": "Royal Nizam Dum Biryani",
                "desc": "Authentic Hyderabadi kacchi dum biryani slow-steamed in sealed clay pots with long-grain aged basmati.",
                "cuisine": "Biryani & Indian",
                "address": "Engineering Square, Level 2 Food Hall",
                "image": "/assets/restaurants/biryani-house.jpg",
                "rating": Decimal("4.88"),
                "reviews": 42,
                "dishes": [
                    {
                        "name": "Royal Dum Chicken Biryani",
                        "desc": "Tender marinated chicken cooked on slow embers with saffron basmati, caramelized onions, and boiled egg.",
                        "price": Decimal("13.99"),
                        "category": "Biryani",
                        "image": "/assets/dishes/hyderabadi-biryani.jpg",
                    },
                    {
                        "name": "Shahi Paneer Dum Biryani",
                        "desc": "Fresh cottage cheese cubes simmered in spiced royal gravy, layered with fragrant saffron rice and mint.",
                        "price": Decimal("12.50"),
                        "category": "Biryani",
                        "image": "/assets/dishes/paneer-biryani.jpg",
                    },
                ],
            },
            {
                "email": "owner_dosa@campus.edu",
                "name": "Sundaram Iyer",
                "phone": "+1 555 0203",
                "rest_name": "Dakshin Express Dosa & Idli Bar",
                "desc": "Crispy golden crepes, fluffy fermented rice cakes, and traditional South Indian filter brews made to order.",
                "cuisine": "South Indian",
                "address": "Student Recreation Center Arcade",
                "image": "/assets/restaurants/dosa-corner.jpg",
                "rating": Decimal("4.92"),
                "reviews": 56,
                "dishes": [
                    {
                        "name": "Ghee Roast Masala Dosa",
                        "desc": "Ultra-crispy golden fermented crepe laced with pure cow ghee, stuffed with spiced potato masala and chutneys.",
                        "price": Decimal("9.50"),
                        "category": "South Indian",
                        "image": "/assets/dishes/masala-dosa.jpg",
                    },
                    {
                        "name": "Crispy Medu Vada (2 pcs)",
                        "desc": "Crispy golden lentil fritters flavored with crushed peppercorns, ginger, and curry leaves. Served with hot sambar.",
                        "price": Decimal("5.25"),
                        "category": "Snacks",
                        "image": "/assets/dishes/medu-vada.jpg",
                    },
                    {
                        "name": "Madras Degree Filter Coffee",
                        "desc": "Freshly brewed chicory-infused dark roast coffee frothed with boiling whole milk in traditional brass dabarah.",
                        "price": Decimal("3.50"),
                        "category": "Beverages",
                        "image": "/assets/dishes/filter-coffee.jpg",
                    },
                ],
            },
            {
                "email": "owner_wok@campus.edu",
                "name": "Chef Ming Chen",
                "phone": "+1 555 0204",
                "rest_name": "Golden Dragon Asian Wok",
                "desc": "High-heat wok noodles, hand-pleated dumplings, and bold Sichuan street food.",
                "cuisine": "Chinese & Asian",
                "address": "International Students Hub, Plaza 3",
                "image": "/assets/restaurants/wok-box.jpg",
                "rating": Decimal("4.78"),
                "reviews": 29,
                "dishes": [
                    {
                        "name": "Wok-Tossed Chili Garlic Hakka Noodles",
                        "desc": "Thin wheat noodles flash-fried with shredded cabbage, bell peppers, scallions, and fiery Sichuan chili oil.",
                        "price": Decimal("11.25"),
                        "category": "Chinese",
                        "image": "/assets/dishes/hakka-noodles.jpg",
                    },
                    {
                        "name": "Steamed Crystal Dim Sum Dumplings",
                        "desc": "Handmade translucent wrappers stuffed with minced water chestnuts, shiitake mushrooms, and tender bamboo shoots.",
                        "price": Decimal("8.99"),
                        "category": "Starters",
                        "image": "/assets/dishes/dim-sum.jpg",
                    },
                ],
            },
            {
                "email": "owner_dhaba@campus.edu",
                "name": "Harpreet Singh",
                "phone": "+1 555 0205",
                "rest_name": "Punjab Junction Dhaba",
                "desc": "Rich clay oven curries, smoky char-grilled skewers, and pillowy tandoori flatbreads.",
                "cuisine": "North Indian",
                "address": "Graduate Housing Complex North",
                "image": "/assets/restaurants/punjab-dhaba.jpg",
                "rating": Decimal("4.85"),
                "reviews": 31,
                "dishes": [
                    {
                        "name": "Creamy Delhi Butter Chicken",
                        "desc": "Char-grilled tandoori chicken simmered in an indulgent tomato, cashew nut, and fenugreek butter gravy.",
                        "price": Decimal("14.99"),
                        "category": "North Indian",
                        "image": "/assets/dishes/butter-chicken.jpg",
                    },
                    {
                        "name": "Smoky Tandoori Paneer Tikka",
                        "desc": "Spiced yogurt-marinated cottage cheese cubes roasted with onions and peppers in the clay tandoor.",
                        "price": Decimal("12.50"),
                        "category": "North Indian",
                        "image": "/assets/dishes/paneer-tikka.jpg",
                    },
                    {
                        "name": "Butter Garlic Naan (2 pcs)",
                        "desc": "Leavened refined flour flatbread slapped on the tandoor walls, brushed with melted butter and toasted garlic.",
                        "price": Decimal("4.25"),
                        "category": "Breads",
                        "image": "/assets/dishes/garlic-naan.jpg",
                    },
                ],
            },
            {
                "email": "owner_sweet@campus.edu",
                "name": "Claire Delacroix",
                "phone": "+1 555 0206",
                "rest_name": "Sweet Tooth Patisserie & Bakes",
                "desc": "Decadent handcrafted desserts, warm Belgian waffles, and artisanal French pastries.",
                "cuisine": "Desserts & Bakery",
                "address": "Library Concourse East",
                "image": "/assets/restaurants/sweet-treats.jpg",
                "rating": Decimal("4.96"),
                "reviews": 64,
                "dishes": [
                    {
                        "name": "Warm Molten Choco Lava Cake",
                        "desc": "Rich dark chocolate sponge with a luscious warm liquid chocolate center, dusted with powdered sugar.",
                        "price": Decimal("7.50"),
                        "category": "Desserts",
                        "image": "/assets/dishes/choco-lava.jpg",
                    },
                    {
                        "name": "Belgian Pearl Sugar Waffle",
                        "desc": "Caramelized yeast-leavened waffle topped with organic strawberries, blueberries, and vanilla bean glaze.",
                        "price": Decimal("8.75"),
                        "category": "Desserts",
                        "image": "/assets/dishes/belgian-waffle.jpg",
                    },
                ],
            },
            {
                "email": "owner_green@campus.edu",
                "name": "Maya Patel",
                "phone": "+1 555 0207",
                "rest_name": "Green Fuel Wellness Cafe",
                "desc": "Vibrant superfood bowls, cold-pressed raw juices, and wholesome plant-forward campus dining.",
                "cuisine": "Healthy Food & Bowls",
                "address": "Campus Wellness Center, 1st Floor",
                "image": "/assets/restaurants/green-fuel.jpg",
                "rating": Decimal("4.82"),
                "reviews": 21,
                "dishes": [
                    {
                        "name": "Açaí Superfood Smoothie Bowl",
                        "desc": "Organic Brazilian açaí puree topped with artisan granola, chia seeds, sliced bananas, and wild honey.",
                        "price": Decimal("10.50"),
                        "category": "Healthy Food",
                        "image": "/assets/dishes/acai-bowl.jpg",
                    },
                    {
                        "name": "Smashed Avocado Sourdough Toast",
                        "desc": "Toasted sourdough with Hass avocado, shaved radishes, chili flakes, hemp seeds, and extra virgin olive oil.",
                        "price": Decimal("9.25"),
                        "category": "Healthy Food",
                        "image": "/assets/dishes/avocado-toast.jpg",
                    },
                ],
            },
        ]

        for eat in additional_eateries:
            u = db.query(User).filter(User.email == eat["email"]).first()
            if not u:
                u = User(
                    email=eat["email"],
                    password_hash=hash_password("Owner1234!"),
                    role=UserRole.OWNER,
                    full_name=eat["name"],
                    phone=eat["phone"],
                    address=eat["address"],
                )
                db.add(u)
                db.flush()

            r = db.query(Restaurant).filter(Restaurant.owner_id == u.id).first()
            if not r:
                r = Restaurant(
                    owner_id=u.id,
                    name=eat["rest_name"],
                    description=eat["desc"],
                    cuisine_type=eat["cuisine"],
                    address=eat["address"],
                    phone=eat["phone"],
                    image_url=eat["image"],
                    avg_rating=eat["rating"],
                    total_reviews=eat["reviews"],
                    is_active=True,
                )
                db.add(r)
                db.flush()
            else:
                r.image_url = eat["image"]
                r.avg_rating = eat["rating"]
                r.total_reviews = eat["reviews"]
                r.description = eat["desc"]

            # Add dishes if not present
            for d in eat["dishes"]:
                existing_item = db.query(MenuItem).filter(
                    MenuItem.restaurant_id == r.id, MenuItem.name == d["name"]
                ).first()
                if not existing_item:
                    item = MenuItem(
                        restaurant_id=r.id,
                        name=d["name"],
                        description=d["desc"],
                        price=d["price"],
                        category=d["category"],
                        image_url=d["image"],
                        is_available=True,
                    )
                    db.add(item)
                else:
                    existing_item.image_url = d["image"]

        # Keep the exact rating aggregate consistent with the seeded display ratings so the first
        # real review updates the average correctly (rating_sum == avg_rating * total_reviews).
        for restaurant in db.query(Restaurant).filter(Restaurant.rating_sum == 0, Restaurant.total_reviews > 0):
            restaurant.rating_sum = round(float(restaurant.avg_rating) * restaurant.total_reviews)

        db.commit()
        print("Expanded campus food seed completed successfully!")
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
