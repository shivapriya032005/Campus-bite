import os
import urllib.request
import time

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "frontend", "public", "assets"))

DIRECTORIES = [
    os.path.join(BASE_DIR, "categories"),
    os.path.join(BASE_DIR, "banners"),
    os.path.join(BASE_DIR, "restaurants"),
    os.path.join(BASE_DIR, "dishes"),
    os.path.join(BASE_DIR, "placeholders"),
]

for d in DIRECTORIES:
    os.makedirs(d, exist_ok=True)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

ASSETS = {
    # Categories (400x400 square circular crop)
    "categories/biryani.jpg": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&h=400&q=80",
    "categories/pizza.jpg": "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&h=400&q=80",
    "categories/burgers.jpg": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&h=400&q=80",
    "categories/chinese.jpg": "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=400&h=400&q=80",
    "categories/south-indian.jpg": "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=400&h=400&q=80",
    "categories/north-indian.jpg": "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=400&h=400&q=80",
    "categories/desserts.jpg": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=400&h=400&q=80",
    "categories/beverages.jpg": "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=400&h=400&q=80",
    "categories/healthy.jpg": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&h=400&q=80",
    "categories/snacks.jpg": "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=400&h=400&q=80",

    # Promotional Banners (1200x500 panoramic)
    "banners/banner-campus-favs.jpg": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&h=500&q=80",
    "banners/banner-biryani-fest.jpg": "https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=1200&h=500&q=80",
    "banners/banner-late-night.jpg": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&h=500&q=80",
    "banners/banner-healthy-eats.jpg": "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&h=500&q=80",

    # Restaurants (800x500 landscape cover)
    "restaurants/bistro.jpg": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&h=500&q=80",
    "restaurants/pizza-hub.jpg": "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&h=500&q=80",
    "restaurants/biryani-house.jpg": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&h=500&q=80",
    "restaurants/dosa-corner.jpg": "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=800&h=500&q=80",
    "restaurants/wok-box.jpg": "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=800&h=500&q=80",
    "restaurants/punjab-dhaba.jpg": "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&h=500&q=80",
    "restaurants/sweet-treats.jpg": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&h=500&q=80",
    "restaurants/green-fuel.jpg": "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=800&h=500&q=80",

    # Dishes (600x600 rich photography)
    "dishes/truffle-burger.jpg": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&h=600&q=80",
    "dishes/crispy-chicken.jpg": "https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=600&h=600&q=80",
    "dishes/sweet-potato-fries.jpg": "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&h=600&q=80",
    "dishes/cold-brew.jpg": "https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&h=600&q=80",
    "dishes/margherita-pizza.jpg": "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=600&h=600&q=80",
    "dishes/pepperoni-pizza.jpg": "https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=600&h=600&q=80",
    "dishes/garlic-bread.jpg": "https://images.unsplash.com/photo-1619860860774-1e2e17343432?auto=format&fit=crop&w=600&h=600&q=80",
    "dishes/hyderabadi-biryani.jpg": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&h=600&q=80",
    "dishes/paneer-biryani.jpg": "https://images.unsplash.com/photo-1642821373181-696a54913e9a?auto=format&fit=crop&w=600&h=600&q=80",
    "dishes/masala-dosa.jpg": "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=600&h=600&q=80",
    "dishes/medu-vada.jpg": "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&h=600&q=80",
    "dishes/filter-coffee.jpg": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&h=600&q=80",
    "dishes/hakka-noodles.jpg": "https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&h=600&q=80",
    "dishes/dim-sum.jpg": "https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=600&h=600&q=80",
    "dishes/butter-chicken.jpg": "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=600&h=600&q=80",
    "dishes/paneer-tikka.jpg": "https://images.unsplash.com/photo-1567184109-7756f5e3ca15?auto=format&fit=crop&w=600&h=600&q=80",
    "dishes/garlic-naan.jpg": "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&h=600&q=80",
    "dishes/choco-lava.jpg": "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&h=600&q=80",
    "dishes/belgian-waffle.jpg": "https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=600&h=600&q=80",
    "dishes/acai-bowl.jpg": "https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=600&h=600&q=80",
    "dishes/avocado-toast.jpg": "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&h=600&q=80",

    # Placeholders
    "placeholders/food-placeholder.jpg": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&h=600&q=80",
    "placeholders/restaurant-placeholder.jpg": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&h=500&q=80",
}

print(f"Downloading {len(ASSETS)} assets to {BASE_DIR}...")
for rel_path, url in ASSETS.items():
    dest = os.path.join(BASE_DIR, rel_path.replace("/", os.sep))
    if os.path.exists(dest) and os.path.getsize(dest) > 1000:
        print(f"Already exists: {rel_path}")
        continue
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read()
            with open(dest, "wb") as f:
                f.write(data)
        print(f"Downloaded: {rel_path} ({len(data)} bytes)")
        time.sleep(0.05)
    except Exception as e:
        print(f"Failed {rel_path}: {e}")

print("Asset preparation finished!")

