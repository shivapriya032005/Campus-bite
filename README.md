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

### Entity-Relationship Architecture (13 Relational Entities)
- **User:** Authentication identity with roles (`customer`, `owner`, `delivery`), bcrypt password hashes, contact & dormitory address.
- **Restaurant:** Restaurant profile linked 1:1 to an owner user, cuisine type, average rating, and active status.
- **MenuItem:** Categorized dishes with Decimal prices, descriptions, and stock availability toggles.
- **Order:** Order records tied to a customer and restaurant, snapshot total amounts, and delivery addresses.
- **OrderItem:** Snapshots item names and unit prices at purchase time to guarantee financial ledger integrity even when menus change.
- **Review:** Post-delivery customer ratings (1–5 stars) and comments. Strict 1:1 constraint per delivered order.
- **PaymentLedger:** Auditable financial records: the original payment (`mock_paid`) is never modified; a cancellation adds a separate `voided` entry and an approved refund adds a `refunded` entry (at most one of each type per order).
- **ReturnRequest:** Customer dispute claims for delivered meals with statuses (`pending`, `approved`, `rejected`).
- **RefundRecord:** Authorized reimbursement records linked 1:1 to approved return requests.
- **DeliveryAssignment:** Courier dispatch records ensuring strict courier isolation.
- **ReminderLog:** One reminder per order per stale stage (>15 minutes in PLACED or ACCEPTED), with an `ACTIVE` / `RESOLVED` / `DISMISSED` lifecycle and preserved history.
- **RateLimitCounter / SchedulerLease:** Shared (multi-worker safe) rate-limit counters and scheduler leases.

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

2. **Start MySQL database and backend services (development stack):**
   ```bash
   docker compose up --build
   ```
   - FastAPI API: `http://localhost:8000` (hot reload, source bind-mounted)
   - Interactive Swagger Docs: `http://localhost:8000/docs`
   - MySQL 8.4 Server: `localhost:3306`
   - Migrations run automatically on start; the stale-order scheduler runs inside the API process.

3. **Start the React frontend development server:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

### Production deployment (Docker Compose)

`docker-compose.prod.yml` is a separate, hardened stack (the development workflow above is unchanged):

```bash
cp .env.example .env.prod      # then edit: strong secrets, CORS_ORIGINS, real MySQL passwords
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

| Service | Purpose |
|---|---|
| `db` | MySQL 8.4 with a persistent named volume and a health check; **not** published to the host |
| `migrate` | One-shot `alembic upgrade head` (waits for the DB first); the API and scheduler start only after it succeeds |
| `api` | Non-root, read-only container, **no `--reload`**, no source mounts, `WEB_CONCURRENCY` workers (default 2), `/api/v1/health` health check, `SCHEDULER_ENABLED=false` |
| `scheduler` | The **single** background-job process (`python -m app.scheduler`) |

Secrets live only in `.env.prod` (git-ignored) and are injected at runtime; `backend/.dockerignore` keeps `.env*` files out of the image.
With `APP_ENV=production` the API **refuses to start** if `JWT_SECRET_KEY` is a placeholder or shorter than 32 characters,
if `MYSQL_PASSWORD` is a placeholder, or if `CORS_ORIGINS` is empty. Generate secrets with `openssl rand -hex 32`.

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

## 5b. Configuration Reference

All settings are environment variables (see `.env.example`; never commit real values).

| Variable | Default | Meaning |
|---|---|---|
| `APP_ENV` | `development` | `production`/`staging` enables strict startup validation |
| `JWT_SECRET_KEY` | dev placeholder | Must be >= 32 random chars and not a placeholder in production |
| `MYSQL_*` / `DATABASE_URL_OVERRIDE` | see file | Database connection (`DATABASE_URL_OVERRIDE=sqlite:///./campusbite.db` for local SQLite) |
| `CORS_ORIGINS` | empty | Comma-separated allowed frontend origins. Wildcards are rejected. Localhost origins are added automatically **only outside production** (`FRONTEND_ORIGIN` still works) |
| `OPENAI_API_KEY` | empty | Enables AI insights (server-side only) |
| `ADMIN_API_KEY` | empty | Enables the admin approval API (>= 32 chars in production) |
| `RATE_LIMIT_LOGIN_MAX` / `_WINDOW_SECONDS` | 10 / 60 | Login attempts per client IP |
| `RATE_LIMIT_REGISTER_MAX` / `_WINDOW_SECONDS` | 5 / 3600 | Registrations per client IP |
| `RATE_LIMIT_AI_MAX` / `_WINDOW_SECONDS` | 20 / 3600 | AI questions per user |
| `TRUST_PROXY_HEADERS` | `false` | Use `X-Forwarded-For` for the client IP. Enable only behind a trusted proxy |
| `SCHEDULER_ENABLED` | `true` | Run the scheduler inside the API process (development). `false` in production |
| `REMINDER_THRESHOLD_MINUTES` / `REMINDER_CHECK_INTERVAL_MINUTES` | 15 / 5 | Stale-order reminder rules |

**Rate limiting** is counted in the database (atomic upserts), so limits hold across all API workers and instances.
Exceeding a limit returns `429` with a `Retry-After` header.

**Account approval.** Customers are active immediately. Restaurant owners and delivery partners register *unapproved*:
they can log in (and see a "pending approval" screen) but every owner/delivery endpoint returns `403`, and unapproved
couriers cannot be assigned orders. Existing and demo accounts remain approved. Approve (or revoke) with the admin key:

```bash
curl -H "X-Admin-Key: $ADMIN_API_KEY" "http://localhost:8000/api/v1/admin/users?approved=false"
curl -X POST -H "X-Admin-Key: $ADMIN_API_KEY" http://localhost:8000/api/v1/admin/users/12/approve
```

**Background reminders.** PLACED/ACCEPTED orders untouched for 15 minutes get exactly one reminder per stage
(database-enforced). Reminders resolve automatically when the order moves on, owners can dismiss them, and
resolved/dismissed reminders are kept as history (`GET /reminders?status=all`). Jobs are guarded by a database lease, so
even an accidental second scheduler cannot duplicate work.

**Payments.** The ledger keeps the original `mock_paid` entry forever. Cancelling a PLACED order adds a separate
`voided` entry; an approved refund adds a `refunded` entry. Each type can occur once per order (unique constraint).

---

## 6. Default Demo Accounts

If you execute `python -m app.db.seed`, the following accounts are pre-configured:

| Role | Email | Password | Features Accessible |
|---|---|---|---|
| **Customer** | `student@campus.edu` | `Student1234!` | Browse restaurants, cart, orders, AI insights |
| **Restaurant Owner** | `owner@campus.edu` | `Owner1234!` | Kitchen orders, menu editor, courier dispatch, refunds |
| **Delivery Courier** | `courier@campus.edu` | `Courier1234!` | Courier hub, active delivery runs, delivery history |

### Demo restaurant owners

The seed also creates seven more restaurants. Each has its own owner account, and **all of them use the password `Owner1234!`**:

| Restaurant | Owner email |
|---|---|
| The Campus Bistro & Grill | `owner@campus.edu` |
| Piazza Napoli Wood-Fired Pizzeria | `owner_pizza@campus.edu` |
| Royal Nizam Dum Biryani | `owner_biryani@campus.edu` |
| Dakshin Express Dosa & Idli Bar | `owner_dosa@campus.edu` |
| Golden Dragon Asian Wok | `owner_wok@campus.edu` |
| Punjab Junction Dhaba | `owner_dhaba@campus.edu` |
| Sweet Tooth Patisserie & Bakes | `owner_sweet@campus.edu` |
| Green Fuel Wellness Cafe | `owner_green@campus.edu` |

These are demo-only credentials for local development. Change or remove them before any real deployment. Accounts you register yourself as an owner or courier need admin approval (see section 5b).

---

## 7. Testing Suite

The backend has 128 automated tests that run on in-memory/file SQLite, plus 8 MySQL integration tests (real
concurrency, enum round-trips, migration up/down) that run when `TEST_MYSQL_URL` points at a **disposable** MySQL database.
Coverage includes authentication, RBAC and data isolation, order lifecycle and invalid transitions, cancellation ledger,
cart merging, date/status filters and pagination, refund workflow, rating aggregation, rate limiting, account approval,
production configuration validation, reminders (dedup, resolution, dismissal), scheduler single-run guarantees and migrations.

```bash
cd backend
python -m pytest tests/ -q                      # SQLite suite (MySQL tests are skipped)

# full run including MySQL (the schema is dropped and rebuilt with Alembic!)
TEST_MYSQL_URL="mysql+pymysql://root:<password>@127.0.0.1:3306/campusbite_test?charset=utf8mb4" python -m pytest tests/ -q
```

Frontend production build check: `cd frontend && npm run build`.

---

## 8. API Reference Summary (`/api/v1`)

- **Auth:** `POST /auth/register`, `POST /auth/login`, `GET /auth/me`
- **Restaurants:** `GET /restaurants`, `GET /restaurants/{id}`, `POST /restaurants`, `PUT /restaurants/{id}`
- **Menu Items:** `GET /menu-items/restaurant/{id}`, `GET /menu-items/owner/all`, `POST /menu-items`, `PUT /menu-items/{id}`, `DELETE /menu-items/{id}`
- **Orders:** `POST /orders`, `GET /orders/my`, `GET /orders/my/{id}`, `POST /orders/my/{id}/cancel`, `GET /orders/restaurant`, `PATCH /orders/{id}/status`
  - List filters: `status` (one status, a comma list, or `ACTIVE`), `date_from` / `date_to` (`YYYY-MM-DD` = whole UTC day, or an ISO-8601 datetime; offsets are converted to UTC; invalid dates or `date_from > date_to` -> `422`), `page`, `per_page`
  - Checkout merges duplicate dishes, takes prices from the database and limits quantity to 50 per dish; orders expose `payment_status` (`mock_paid` / `voided` / `refunded`)
- **Payments:** `GET /orders/{id}/payments`
- **Reviews:** `POST /orders/{id}/review`, `GET /restaurants/{id}/reviews`
- **Refunds:** `POST /orders/{id}/return`, `GET /orders/{id}/return`, `GET /refunds/pending`, `POST /refunds/{id}/action`
- **Deliveries:** `POST /deliveries/assign/{order_id}`, `GET /deliveries/partners`, `GET /deliveries/my`, `GET /deliveries/my/{id}`, `PATCH /deliveries/my/{id}/status`
- **Reminders:** `GET /reminders?status=active|resolved|dismissed|all`, `POST /reminders/generate`, `POST /reminders/{id}/dismiss`
- **Admin (requires `X-Admin-Key`):** `GET /admin/users`, `POST /admin/users/{id}/approve`, `POST /admin/users/{id}/revoke`
- **Analytics:** `GET /dashboard/stats`
- **AI Insights:** `POST /insights` (OpenAI server-side completion with customer order isolation)
- **Health:** `GET /health`

List endpoints that return plain arrays (`/deliveries/my`, `/refunds/pending`, `/reminders`, `/restaurants/{id}/reviews`) accept `page` / `per_page` and report the total in the `X-Total-Count` header. All responses carry `X-Process-Time-Ms`.
