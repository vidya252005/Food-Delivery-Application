# FoodClub — Curated Food Delivery Platform

A full-stack food delivery app focused on healthy, quality-verified restaurants in Bengaluru. Customers discover curated partners, place orders with nutrition-aware checkout, and track delivery in real time. Restaurants manage menus, fulfill orders through a strict state machine, and apply for quality verification. Built as a solo project end to end.

**Stack:** React · Node.js / Express 5 · PostgreSQL 16 · JWT · Socket.io · Docker · GitHub Actions

**Deep dives:** [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · [`docs/BENCHMARK_RESULTS.md`](docs/BENCHMARK_RESULTS.md) · [`docs/LOADTEST_RESULTS.md`](docs/LOADTEST_RESULTS.md)

---

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 16 (or Docker)

### Option A — Docker Compose (fastest)

```bash
docker compose up --build
curl http://localhost:5001/health
```

Builds the backend, starts Postgres, runs migrations, and serves the API on port **5001**.

### Option B — Local development

```bash
# 1. Backend
cd backend
cp .env.example .env
npm install

# Create DB (adjust credentials to match .env)
# psql -c "CREATE USER food_delivery_app WITH PASSWORD 'devpassword';"
# psql -c "CREATE DATABASE food_delivery OWNER food_delivery_app;"
# psql -c "CREATE DATABASE food_delivery_test OWNER food_delivery_app;"

npm run migrate
npm run seed          # 24 Bengaluru restaurants + demo accounts
npm run dev           # http://localhost:5001

# 2. Frontend (separate terminal)
cd frontend
cp .env.example .env
npm install
npm start             # http://localhost:3000
```

**Demo logins** (password for all: `password123`)

| Role | Email |
|---|---|
| Customer (FoodClub Select) | `priya@example.com` |
| Admin | `admin@foodclub.in` |
| Restaurant (pending verification) | `yogurberry@example.com` |

### Useful commands

```bash
cd backend
npm test                  # full test suite
npm run lint
npm run seed:benchmark    # ~300k orders for perf scripts
npm run benchmark         # indexed vs unindexed query latency
npm run loadtest          # HTTP load test (server must be running)
```

---

## Problem Understanding

The goal was to build a credible Swiggy/Zomato-style delivery platform, but with a clear differentiator: **curated, health-conscious restaurants** rather than a generic aggregator.

That implied several concrete requirements:

1. **Two-sided marketplace** — customers browse and order; restaurants onboard, manage menus, and advance orders through a lifecycle.
2. **Trust and quality** — verification workflow, quality scores, dietary tags, and nutrition data on menus and orders.
3. **Geo-aware launch** — Bengaluru-only service area with honest “coming soon” gating for unsupported cities and INR pricing throughout.
4. **Production-shaped backend** — layered architecture, real Postgres (no ORM), migrations, auth, rate limiting, and measurable performance at scale.
5. **Security that holds up to inspection** — order history and status updates must not be readable or writable by arbitrary IDs (IDOR).

The frontend needed to feel polished (landing page, carousel, ₹ prices) without over-claiming integrations the code does not actually call (live payment gateways, Redis clusters, etc.).

---

## Solution Approach

I split the system into a **React SPA** and a **layered Express API** backed by **PostgreSQL**, connected over REST and Socket.io for live tracking.

```
Browser (React)
    │  REST + WebSocket
    ▼
Express 5  →  middleware (CORS, rate limit, JWT, order ownership)
    │         controllers (thin HTTP)
    │         services (business rules, state machine, payments)
    │         repositories (parameterized SQL via pg)
    ▼
PostgreSQL 16
```

High-level flow:

- **Discovery** — list, search, filter by dietary prefs, quality score, and FoodClub Select eligibility; short TTL in-process cache on hot read paths.
- **Checkout** — cart pricing mirrors backend rules (GST, delivery fee, Select discounts); payment uses Strategy/Factory with **simulated** providers.
- **Fulfillment** — orders move through an explicit state machine; restaurants PATCH status only on orders they own; side effects (notifications, sockets) go through an observer pub/sub.
- **Verification** — restaurants submit evidence; admins approve or reject from a dedicated queue.

Performance is validated with reproducible scripts: benchmark at ~300k orders and autocannon load tests against a running server — results committed under `docs/`.

---

## Implementation Details

### Backend layers

| Layer | Role | Examples |
|---|---|---|
| Routes | HTTP wiring + middleware chain | `orders.routes.js` — auth before handlers |
| Controllers | Request/response only | `orderController`, `foodclubController` |
| Services | Domain logic | `orderService` state machine, `paymentService` idempotency |
| Repositories | Parameterized SQL, one resource per file | `orderRepository`, `restaurantRepository` |
| Domain | Pure rules & enums | `orderStates/`, `money.js` |

### Order state machine

Statuses: `created` → `payment_pending` → `confirmed` → `restaurant_accepted` → `preparing` → `ready_for_pickup` → `out_for_delivery` → `delivered`. Illegal skips return **409**. Terminal states reject further transitions. Conditional `UPDATE … WHERE status = $current` guards against concurrent races.

### Auth & authorization

- JWT with `{ id, role }` for `user`, `restaurant`, and `admin`.
- **Resource ownership** on orders (`middleware/orderAuth.js`):
  - `GET /api/orders/user/:userId` — caller must be that user (or admin).
  - `GET /api/orders/restaurant/:restaurantId` — caller must be that restaurant.
  - `PATCH /api/orders/:id/status` — restaurant must own the order.
  - `GET /api/orders/:id`, tracking, cancel — customer, restaurant, or admin on that order only.

### Payments (simulated)

Strategy + Factory pattern (`Card`, `UPI`, `Wallet`, `COD`). Non-COD strategies call `simulateProviderDelay()` and return a local transaction ID. Idempotency keys prevent double-charge on retry. **No live Razorpay or Stripe calls.**

### FoodClub-specific features

- Quality profiles, verification status, admin review API.
- Menu nutrition snapshots copied to `order_items` at checkout; `nutritionSummary` on order responses.
- FoodClub Select membership (pricing benefits, eligibility filters).
- Bengaluru city gate on cart/checkout; coming-soon UX elsewhere.
- In-app notifications + Socket.io driver simulation for tracking.

### Frontend

Create React App with React Router, context providers (auth, cart, location, socket), and role-based routes. Landing page (hero carousel, green/white theme), discover with dietary filters, checkout, order tracking, restaurant dashboard, and admin verification UI.

### Performance (measured, not asserted)

At **300k orders** ([`docs/BENCHMARK_RESULTS.md`](docs/BENCHMARK_RESULTS.md)):

| Query | Without index (avg) | With index (avg) | Improvement |
|---|---|---|---|
| User order history | 33.4 ms | 1.3 ms | 96% |
| Restaurant active orders | 49.1 ms | 12.5 ms | 75% |

Load test ([`docs/LOADTEST_RESULTS.md`](docs/LOADTEST_RESULTS.md), 50 concurrent / 6s): ~2,400 req/s on restaurant reads, ~1,800 req/s on authenticated order writes (p50 ~19 ms).

### Project layout

```
backend/src/     app, routes, controllers, services, repositories, domain, middleware
backend/tests/   unit, integration, system
backend/scripts/ seed, benchmark, loadtest
frontend/src/    pages, components, context, utils
docs/            architecture, benchmark, loadtest, sprint notes
```

---

## Decisions and Trade-offs

| Decision | Why | Trade-off |
|---|---|---|
| **Raw SQL + repositories, no ORM** | Explicit queries, easy to benchmark indexes, no magic N+1 | More boilerplate than Prisma/Sequelize |
| **In-process rate limit & cache** | Zero extra infra for solo dev/demo | Not shared across multiple Node instances; Redis would be needed in production |
| **Simulated payment providers** | Strategy pattern is real and testable without API keys | Cannot demo live payment webhooks |
| **JWT stateless auth** | Simple for SPA + mobile-shaped API | No server-side revoke list without extra storage |
| **Strict order state machine** | Prevents invalid lifecycle bugs; clear 409 semantics | More steps than a single “status string” field |
| **Bengaluru-only launch** | Focused seed data, honest UX, INR-native pricing | Other cities see coming-soon, not full catalog |
| **Separate `food_delivery_test` DB** | Integration tests hit real Postgres, not mocks | Requires local DB setup |
| **Express app exported without `.listen()`** | Supertest can import `app.js` directly | Slightly split entry (`server.js` vs `app.js`) |

Security was treated as a regression surface: order list/status IDOR was closed with middleware checks and dedicated integration tests, not just “we added auth somewhere.”

---

## Future Improvements

- **Shared Redis** for rate limiting, session deny-list, and cross-instance cache invalidation.
- **Live payment gateway** (Razorpay/Stripe) behind the existing Strategy interface — swap simulated strategies for HTTP clients without changing `paymentService`.
- **Trigram/GIN index** on restaurant name and menu item search (today prefix search uses B-tree; `%term%` still seq-scans).
- **Read replicas** or connection routing for list/discover under heavy load.
- **Push notifications** (FCM/APNs) in addition to in-app notifications.
- **Multi-city rollout** with geofenced service areas and per-city restaurant catalogs.
- **E2E tests** (Playwright) over the React app for checkout and tracking flows.

---

## Testing Strategy

Tests run against a **real PostgreSQL test database** — migrated in Jest `globalSetup`, truncated `beforeEach` for isolation.

```bash
cd backend
npm test                # all suites
npm run test:unit       # mappers, state machine, auth helpers
npm run test:integration # HTTP + DB per route group (orders, auth, restaurants)
npm run test:system     # end-to-end flows
npm run test:coverage
```

**What each layer catches:**

| Layer | Focus | Example |
|---|---|---|
| Unit | Pure logic, mocked repos | Illegal state transition → 409; invalid status → 400 |
| Integration | Single route group + DB | Order IDOR: user A cannot read user B's history; status PATCH requires restaurant ownership |
| System | Multi-step user journeys | Register restaurant → add menu → customer orders → full lifecycle → feedback → dashboard stats |

**CI** (`.github/workflows/ci-cd.yml`): ESLint, full suite with coverage against a Postgres service container, `npm audit`, Docker image build, and HTTP smoke test on `/health`.

**Performance verification** is separate from functional tests: `npm run benchmark` and `npm run loadtest` write reproducible reports to `docs/` so index and throughput claims stay tied to actual numbers.

---

## API overview

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/user/register`, `/login` | — | Customer auth |
| POST | `/api/auth/restaurant/register`, `/login` | — | Restaurant auth |
| GET | `/api/restaurants` | — | List active restaurants |
| GET | `/api/restaurants/search/:query` | — | Search name / cuisine / menu |
| GET | `/api/restaurants/:id` | — | Detail + menu |
| GET/POST/PUT/DELETE | `/api/restaurant/menu` | restaurant | Own menu CRUD |
| GET | `/api/restaurant/stats` | restaurant | Dashboard stats |
| GET | `/api/restaurant/orders` | restaurant | Own order queue |
| POST | `/api/orders` | user | Place order |
| GET | `/api/orders/user/:userId` | user | Own order history |
| GET | `/api/orders/restaurant/:restaurantId` | restaurant | Own orders |
| PATCH | `/api/orders/:id/status` | restaurant | Advance state machine |
| GET | `/api/orders/:id` | user or restaurant | Order detail |
| POST | `/api/feedback` | — | One feedback per order |
| POST/GET | `/api/support` | — | Support tickets |
| GET | `/health` | — | Liveness + DB + pool stats |
