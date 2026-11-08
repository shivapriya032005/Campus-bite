# CampusBite — Full-Stack Restaurant Ordering & Delivery Platform

CampusBite is a modern, production-grade restaurant ordering and delivery platform tailored for university campuses. Built with React 18, Tailwind CSS, FastAPI, SQLAlchemy ORM, MySQL 8+, Docker Compose, and OpenAI API integration.

---

## 1. Project Overview

CampusBite delivers a seamless, multi-role food tech ecosystem supporting three distinct user types:
1. **Customer (Student / Faculty):** Discover campus eateries, browse categorized menus with price filters, manage single-restaurant carts, place orders with mock ledger payments, track live order progression, submit post-delivery reviews, file refund claims, and query order history using AI insights.
2. **Restaurant Owner:** Real-time kitchen management dashboard, menu item management with stock toggling, order status advancement (`PLACED` → `ACCEPTED` → `PREPARING` → `READY`), delivery courier dispatching, dispute & refund authorization, and automated stale-order reminder tracking.
3. **Delivery Partner (Courier):** Dedicated courier dashboard, assigned delivery pickups, customer and restaurant location manifests, real-time status progression (`ASSIGNED` → `OUT_FOR_DELIVERY` → `DELIVERED`), and completed trip fulfillment archives.

---

## 2. Technology Stack

### Frontend
- **Framework:** React 18 with Vite
- **Styling:** Tailwind CSS 4 with custom dark food-tech theme (Champagne gold accent `#C5A46D`, deep navy `#111827`, charcoal `#1F2937`)
- **State Management:** React Context API (`AuthContext`, `CartContext`, `ToastContext`)
- **Icons:** Lucide React
- **HTTP Client:** Axios with JWT request interceptors & automatic session invalidation
- **Routing:** React Router DOM v6 with role-based `ProtectedRoute` guards

### Backend
- **Framework:** FastAPI (Python 3.12+)
- **ORM & Validation:** SQLAlchemy 2.0+ with Pydantic v2 schemas
- **Database Migrations:** Alembic migrations with versioned scripts
- **Security & Auth:** JWT tokens (`HS256`), salted password hashing via `bcrypt`
- **Background Tasks:** APScheduler background worker monitoring stale orders (>15 min without progression)
- **AI Integration:** Server-side OpenAI API integration (`gpt-4o-mini`) with strictly isolated customer query contexts

### Database & Infrastructure
- **RDBMS:** MySQL 8.4+ with InnoDB engine, decimal monetary precision, strict foreign keys, indexes, and unique constraints
- **Containerization:** Docker & Docker Compose with health checks and persistent data volumes

---

## 3. Architecture & Data Model

### Entity-Relationship Architecture (11 Relational Entities)
- **User:** Authentication identity with roles (`customer`, `owner`, `delivery`), bcrypt password hashes, contact & dormitory address.
- **Restaurant:** Restaurant profile linked 1:1 to an owner user, cuisine type, average rating, and active status.
- **MenuItem:** Categorized dishes with Decimal prices, descriptions, and stock availability toggles.
- **Order:** Order records tied to a customer and restaurant, snapshot total amounts, and delivery addresses.
- **OrderItem:** Snapshots item names and unit prices at purchase time to guarantee financial ledger integrity even when menus change.
- **Review:** Post-delivery customer ratings (1–5 stars) and comments. Strict 1:1 constraint per delivered order.
- **PaymentLedger:** Auditable double-entry financial records tracking both initial payment authorization (`mock_paid`) and subsequent refund credits (`refunded`).
- **ReturnRequest:** Customer dispute claims for delivered meals with statuses (`pending`, `approved`, `rejected`).
- **RefundRecord:** Authorized reimbursement records linked 1:1 to approved return requests.
- **DeliveryAssignment:** Courier dispatch records ensuring strict courier isolation.
- **ReminderLog:** Automated records tracking orders remaining stale in kitchen pipeline for >15 minutes.

### Order Lifecycle State Machine
```
[ PLACED ] ──(Owner Accepts)──► [ ACCEPTED ] ──(Owner Cooks)──► [ PREPARING ] ──(Owner Ready)──► [ READY ]
     │                                                                                               │
     ├──(Customer Cancels)──► [ CANCELLED ]                                              (Owner Assigns Courier)
                                                                                                     │
                                                                                                     ▼
[ REFUNDED ] ◄──(Owner Approves Refund)── [ DELIVERED ] ◄──(Courier Completes)── [ OUT_FOR_DELIVERY ] ◄── [ ASSIGNED ]
```

---

## 4. Directory Structure

```
campusbite/
├── .env.example                  # Environment configuration template
├── docker-compose.yml            # Multi-container orchestration (MySQL + FastAPI)
├── README.md                     # Comprehensive project documentation
├── backend/
│   ├── Dockerfile                # Production Python container configuration
│   ├── requirements.txt          # Python dependencies
│   ├── alembic.ini               # Database migration settings
│   ├── alembic/                  # Alembic environment and migration versions
│   │   ├── env.py
│   │   └── versions/001_initial_schema.py
│   ├── app/
│   │   ├── main.py               # Application factory, middleware & routing
│   │   ├── api/                  # Versioned API routes (/api/v1)
│   │   │   ├── health.py
│   │   │   └── v1/endpoints/     # Auth, Restaurants, Menu, Orders, Deliveries, etc.
│   │   ├── core/                 # Config (Pydantic Settings) & Security (bcrypt, JWT)
│   │   ├── db/                   # Engine, SessionLocal, Base, Seed scripts
│   │   ├── models/               # 11 SQLAlchemy ORM models
│   │   ├── schemas/              # Pydantic request and response schemas
│   │   └── tasks/                # APScheduler background tasks (stale order reminders)
│   └── tests/                    # Pytest test suite (16 automated tests)
└── frontend/
    ├── package.json              # Frontend npm dependencies and scripts
    ├── vite.config.js            # Vite build configuration with Tailwind CSS
    ├── index.html                # Single-page application entry point
    └── src/
        ├── api/client.js         # Authenticated Axios client
        ├── context/              # AuthContext & CartContext
        ├── components/
        │   ├── common/           # Button, Card, Input, Modal, Badge, Toast, Spinner
        │   └── layout/           # Navbar, MainLayout, ProtectedRoute
        └── pages/
            ├── HomePage.jsx      # High-conversion food-tech landing page
            ├── auth/             # LoginPage & RegisterPage
            ├── customer/         # Restaurants, Detail, Cart, Orders, Detail, AI Insights
            ├── restaurant/       # Owner Dashboard, Menu, Orders, Dispatch, Refunds, Reminders
            └── delivery/         # Courier Dashboard, Trip Detail, Fulfillment History
```

---

## 5. Getting Started & Installation

### Option A: Running with Docker Compose (Recommended)

1. **Clone repository and configure environment:**
   ```bash
   cp .env.example .env
   ```
   *(On Windows PowerShell: `Copy-Item .env.example .env`)*

2. **Start MySQL database and backend services:**
   ```bash
   docker compose up --build
   ```
   - FastAPI API: `http://localhost:8000`
   - Interactive Swagger Docs: `http://localhost:8000/docs`
   - MySQL 8.4 Server: `localhost:3306`

3. **Start the React frontend development server:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

### Option B: Running Locally (Manual Setup)

#### 1. Backend Setup:
```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate
# Linux/macOS
source venv/bin/activate

pip install -r requirements.txt
```

Run database migrations:
```bash
alembic upgrade head
```

Optional: Seed initial demo accounts:
```bash
python -m app.db.seed
```

Start the FastAPI development server:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Frontend Setup:
```bash
cd frontend
npm install
npm run dev
```

---

## 6. Default Demo Accounts

If you execute `python -m app.db.seed`, the following accounts are pre-configured:

| Role | Email | Password | Features Accessible |
|---|---|---|---|
| **Customer** | `student@campus.edu` | `Student1234!` | Browse restaurants, cart, orders, AI insights |
| **Restaurant Owner** | `owner@campus.edu` | `Owner1234!` | Kitchen orders, menu editor, courier dispatch, refunds |
| **Delivery Courier** | `courier@campus.edu` | `Courier1234!` | Courier hub, active delivery runs, delivery history |

---

## 7. Testing Suite

CampusBite features 16 automated tests covering authentication, RBAC, restaurant ownership, menu availability, cart validation, order lifecycle transitions, courier isolation, and AI data isolation.

To execute tests:
```bash
cd backend
python -m pytest tests/ -v
```

Test coverage results:
```
tests/test_auth.py::test_password_hashing PASSED
tests/test_auth.py::test_customer_registration_success PASSED
tests/test_auth.py::test_duplicate_registration_fails PASSED
tests/test_auth.py::test_login_success_and_me_endpoint PASSED
tests/test_auth.py::test_login_invalid_password_fails PASSED
tests/test_auth.py::test_role_authorization_restriction PASSED
tests/test_deliveries_refunds_reviews.py::test_delivery_assignment_and_progression PASSED
tests/test_deliveries_refunds_reviews.py::test_reviews_eligibility_and_duplicate_prevention PASSED
tests/test_deliveries_refunds_reviews.py::test_refund_workflow_and_ledger PASSED
tests/test_insights_security.py::test_ai_context_customer_data_isolation PASSED
tests/test_insights_security.py::test_ai_insights_unconfigured_api_key PASSED
tests/test_orders_lifecycle.py::test_order_placement_and_mock_payment PASSED
tests/test_orders_lifecycle.py::test_order_lifecycle_transitions PASSED
tests/test_orders_lifecycle.py::test_customer_cancellation_rules PASSED
tests/test_restaurants_menu.py::test_restaurant_creation_and_ownership PASSED
tests/test_restaurants_menu.py::test_menu_item_crud_and_availability PASSED
======================== 16 passed in 8.67s ========================
```

---

## 8. API Reference Summary (`/api/v1`)

- **Auth:** `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- **Restaurants:** `GET /restaurants`, `GET /restaurants/{id}`, `POST /restaurants`, `PUT /restaurants/{id}`
- **Menu Items:** `GET /menu-items/restaurant/{id}`, `GET /menu-items/owner/all`, `POST /menu-items`, `PUT /menu-items/{id}`, `DELETE /menu-items/{id}`
- **Orders:** `POST /orders`, `GET /orders/my`, `GET /orders/my/{id}`, `POST /orders/my/{id}/cancel`, `GET /orders/restaurant`, `PATCH /orders/{id}/status`
- **Payments:** `GET /orders/{id}/payments`
- **Reviews:** `POST /orders/{id}/review`, `GET /restaurants/{id}/reviews`
- **Refunds:** `POST /orders/{id}/return`, `GET /orders/{id}/return`, `GET /refunds/pending`, `POST /refunds/{id}/action`
- **Deliveries:** `POST /deliveries/assign/{order_id}`, `GET /deliveries/partners`, `GET /deliveries/my`, `GET /deliveries/my/{id}`, `PATCH /deliveries/my/{id}/status`
- **Reminders:** `GET /reminders`, `POST /reminders/generate`
- **Analytics:** `GET /dashboard/stats`
- **AI Insights:** `POST /insights` (OpenAI server-side completion with customer order isolation)
- **Health:** `GET /health`
