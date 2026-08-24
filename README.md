# An online food delivery system

**Project ID:** P13
**Course:** UE23CS341A
**Academic Year:** 2025
**Semester:** 5th Sem
**Campus:** RR
**Branch:** AIML
**Section:** F
**Team:** Agile Coders

## Project Description

A Swiggy/Zomato-style food delivery app: customers browse restaurants, order,
and track delivery status; restaurants manage their menu and fulfill orders
through a stateful workflow.

Originally built as the UE23CS341A course project. The backend has since
been rebuilt on PostgreSQL - see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
for the layered design, [`docs/BENCHMARK_RESULTS.md`](docs/BENCHMARK_RESULTS.md)
for real indexed-vs-unindexed query numbers, and
[`docs/SPRINTS.md`](docs/SPRINTS.md) for how that work breaks down.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React (Create React App), React Router |
| Backend | Node.js, Express 5 |
| Database | PostgreSQL 16 (`pg`, no ORM - parameterized SQL in the repository layer) |
| Auth | JWT + bcrypt |
| Rate limiting | In-process sliding window (per IP; not Redis) |
| Payments | Strategy/Factory pattern with **simulated** providers (no live gateway) |
| Testing | Jest, Supertest |
| CI/CD | GitHub Actions (lint, test w/ coverage, dependency audit, Docker build + smoke test) |
| Containerization | Docker, docker-compose |

## Development Team (Agile Coders)

- [@pes1ug23am338](https://github.com/pes1ug23am338) - Scrum Master
- [@pes1ug23am312-ops](https://github.com/pes1ug23am312-ops) - Developer Team
- [@reddyvaishnavii](https://github.com/reddyvaishnavii) - Developer Team
- [@pes1ug23am348](https://github.com/pes1ug23am348) - Developer Team

## Teaching Assistant

- [@mandhara123](https://github.com/mandhara123)
- [@vanillacoke77](https://github.com/vanillacoke77)

## Faculty Supervisor

- [@Jayashree](https://github.com/Jayashree)

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 16 (or Docker, to run it in a container instead)

### Option A: Docker Compose (fastest)

```bash
docker compose up --build
# once containers are healthy:
curl http://localhost:5001/health
```

This builds the backend image, starts Postgres, waits for it to report
healthy, runs migrations, and starts the API on port 5001.

### Option B: Run locally

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Configure the database**
   ```bash
   cp .env.example .env
   # edit .env if your local Postgres credentials differ from the defaults
   ```
   Create the database and role referenced in `.env` (defaults shown):
   ```sql
   CREATE USER food_delivery_app WITH PASSWORD 'devpassword';
   CREATE DATABASE food_delivery OWNER food_delivery_app;
   CREATE DATABASE food_delivery_test OWNER food_delivery_app;
   ```

3. **Run migrations and seed sample data**
   ```bash
   npm run migrate
   npm run seed
   ```
   This creates demo users, **24 Bengaluru restaurants** with menus, and sample
   orders. Every seeded account's password is `password123`.

4. **Start the API**
   ```bash
   npm run dev      # with auto-reload
   # or
   npm start
   ```

5. **Start the frontend** (separate terminal)
   ```bash
   cd frontend
   npm install
   npm start
   ```

## Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── app.js              # Express app (no .listen() - testable)
│   │   ├── server.js           # entrypoint: connects DB, starts listening
│   │   ├── config/              # env, connection pool
│   │   ├── db/migrations/       # SQL migrations + runner
│   │   ├── repositories/        # parameterized SQL, one file per resource
│   │   ├── services/            # business logic (order state machine, auth)
│   │   ├── controllers/         # thin HTTP layer
│   │   ├── routes/
│   │   ├── middleware/          # JWT auth, error handler
│   │   └── utils/
│   ├── scripts/                 # seed.js, benchmark.js, loadtest.js
│   ├── tests/{unit,integration,system}/
│   ├── Dockerfile
│   └── docker-entrypoint.sh     # migrate, then serve
├── frontend/                    # React app (unchanged API contract)
├── docs/
│   ├── ARCHITECTURE.md
│   ├── BENCHMARK_RESULTS.md
│   ├── LOADTEST_RESULTS.md
│   └── SPRINTS.md
├── docker-compose.yml
└── .github/workflows/ci-cd.yml
```

## Testing

```bash
cd backend
npm test                # full suite
npm run test:unit
npm run test:integration
npm run test:system
npm run test:coverage
```

Integration and system tests run against a real `food_delivery_test`
database (migrated automatically by Jest's `globalSetup`), not mocks -
`beforeEach` truncates every table so tests stay isolated from each other.

## Linting

```bash
npm run lint
npm run lint:fix
```

## Performance validation

```bash
npm run seed:benchmark   # seeds ~300k orders
npm run benchmark        # measures real query latency, indexes on vs. off
npm run loadtest         # concurrent HTTP load test (needs the server running)
```

Results land in `docs/BENCHMARK_RESULTS.md` / `docs/LOADTEST_RESULTS.md`
each time you run them, so the numbers in this repo are always
reproducible, not just asserted.

## Security notes

- Order list and status endpoints require JWT and enforce resource ownership (IDOR regression tests in `tests/integration/orders.routes.test.js`).
- Auth routes are rate-limited (30 req/min/IP); other API routes 300 req/min/IP via an in-process limiter — **not Redis**. A prior MongoDB version mentioned Redis-backed limits; that did not carry over to this Postgres rewrite.
- Payment methods (card, UPI, wallet, COD) use the Strategy pattern but **simulate** provider responses — there is no live Razorpay/Stripe integration.

## API overview

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/user/register`, `/login` | - | User auth |
| POST | `/api/auth/restaurant/register`, `/login` | - | Restaurant auth |
| GET | `/api/restaurants` | - | List active restaurants |
| GET | `/api/restaurants/search/:query` | - | Search by name/cuisine/menu item |
| GET | `/api/restaurants/:id` | - | Restaurant detail + menu |
| GET/POST/PUT/DELETE | `/api/restaurant/menu` | restaurant | Manage own menu |
| GET | `/api/restaurant/stats` | restaurant | Dashboard stats |
| GET | `/api/restaurant/orders` | restaurant | Own orders |
| POST | `/api/orders` | user | Place an order (body.user must match token) |
| GET | `/api/orders/user/:userId` | user | Own order history only (`:userId` must match token) |
| GET | `/api/orders/restaurant/:restaurantId` | restaurant | Own order queue only |
| PATCH | `/api/orders/:id/status` | restaurant | Advance order state (must own the order) |
| GET | `/api/orders/:id` | user or restaurant | Order detail (participant only) |
| POST | `/api/feedback` | - | Leave feedback (one per order) |
| POST/GET | `/api/support` | - | File / list support tickets |
| GET | `/health` | - | Liveness + DB connectivity + pool stats |

## CI/CD

`.github/workflows/ci-cd.yml` runs on every push/PR to `main`: lint, the
full test suite with coverage against a real Postgres service container,
a dependency audit, and a job that builds the Docker image and smoke-tests
the running container over HTTP before considering the build green.

## License

This project is developed for educational purposes as part of the PES
University UE23CS341A curriculum.

---

**Course:** UE23CS341A
**Institution:** PES University
**Academic Year:** 2025
**Semester:** 5th Sem
