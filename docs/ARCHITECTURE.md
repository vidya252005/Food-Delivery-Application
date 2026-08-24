# Architecture

FoodClub is a layered Node.js/Express API backed by PostgreSQL 16. The frontend is a Create React App SPA that talks to the same REST contract the course project started with; the backend was rebuilt without an ORM so every query is explicit, parameterized SQL.

## Request flow

```
HTTP request
  → middleware (CORS, JSON body, rate limit, JWT auth where required)
  → route
  → controller (thin — parse/validate input, call service, map response)
  → service (business rules, state machines, orchestration)
  → repository (parameterized SQL via `pg`)
  → PostgreSQL
```

Errors bubble up to a single `errorHandler` middleware. Controllers use `asyncHandler` so rejected promises become HTTP responses instead of unhandled rejections.

## Layers

| Layer | Responsibility | Example |
|---|---|---|
| **Routes** | HTTP verbs, path params, middleware chain | `orders.routes.js` — auth + IDOR checks before handlers |
| **Controllers** | HTTP I/O only | `orderController.create` → `orderService.create` |
| **Services** | Domain logic, transactions, workflows | `orderService` state machine, `paymentService` idempotency |
| **Repositories** | One file per table/resource; no business rules | `orderRepository.findByUserId` |
| **Domain** | Enums, value objects, pure state rules | `orderStates/index.js`, `money.js` |

## Authentication & authorization

- **JWT** (bcrypt-hashed passwords at registration). Tokens carry `{ id, role }` where `role` is `user`, `restaurant`, or `admin`.
- **Order endpoints** enforce ownership:
  - `GET /api/orders/user/:userId` — authenticated user must match `:userId` (admin bypass).
  - `GET /api/orders/restaurant/:restaurantId` — authenticated restaurant must match `:restaurantId`.
  - `PATCH /api/orders/:id/status` — restaurant token + order must belong to that restaurant.
  - `GET /api/orders/:id`, tracking, cancel — JWT required; caller must be the customer, the restaurant, or admin.
- Middleware lives in `middleware/auth.js` (token parsing) and `middleware/orderAuth.js` (resource-level checks).

## Rate limiting

In-process sliding-window limiter (`middleware/rateLimit.js`):

- `/api/auth/*` — 30 requests/minute per IP
- Other `/api/*` routes — 300 requests/minute per IP

This is **not Redis-backed**. It protects a single Node process in dev/demo; a multi-instance deployment would need a shared store (Redis, etc.) for consistent limits.

## Payments (simulated providers)

The payment layer uses the **Strategy + Factory** pattern:

- `PaymentStrategy` base class
- Concrete strategies: card, UPI, wallet, COD (`strategies/payment/paymentStrategies.js`)
- `PaymentStrategyFactory.getPaymentStrategy(method)` selects the strategy
- `paymentService.pay()` handles idempotency keys and persists rows in `payments`

All four non-COD strategies call `simulateProviderDelay()` (300 ms timeout) and return a locally generated transaction ID. **No live Razorpay, Stripe, or UPI gateway calls** — suitable for demos and tests without API keys.

## Order state machine

Order status transitions are defined in `domain/orderStates/index.js` and enforced in `orderService.transition()`. Invalid skips (e.g. `pending` → `delivered`) return HTTP 409. Terminal states (`delivered`, `cancelled`) reject further updates.

## Caching

Read-heavy restaurant list/discover/nearby endpoints use a short TTL in-process cache (`utils/ttlCache.js`, 45–120 s). Same caveat as rate limiting: per-process only, not shared across instances.

## Database

- Migrations in `src/db/migrations/` (numbered SQL files, applied by `npm run migrate`).
- Performance indexes on `orders(user_id)`, `orders(restaurant_id)`, and `orders(restaurant_id, status)` — see [`BENCHMARK_RESULTS.md`](BENCHMARK_RESULTS.md) for measured impact at ~300k rows.
- Integration/system tests use a real `food_delivery_test` database; `beforeEach` truncates tables for isolation.

## Real-time & events

- Socket.io for live order/delivery updates (`services/socketService.js`).
- `EventPublisher` + observers (e.g. `NotificationObserver`, `SocketObserver`) decouple side effects from core order flow.

## Testing pyramid

```
tests/unit/          — mappers, state machine, pure helpers
tests/integration/   — HTTP + DB for one route group (orders, auth, …)
tests/system/        — multi-step flows (register → menu → order → lifecycle → feedback)
```

CI runs lint, full suite with coverage, dependency audit, and Docker smoke test (`.github/workflows/ci-cd.yml`).

## Related docs

- [`SPRINTS.md`](SPRINTS.md) — feature increments and sprint notes
- [`BENCHMARK_RESULTS.md`](BENCHMARK_RESULTS.md) — indexed vs unindexed query latency
- [`LOADTEST_RESULTS.md`](LOADTEST_RESULTS.md) — concurrent HTTP load on a running server
