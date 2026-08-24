# Sprint breakdown

## Sprint 1 — Data layer migration
- Normalized Postgres schema, migration runner, connection pool

## Sprint 2 — Layered architecture & order workflow
- Repositories, services, controllers, order state machine

## Sprint 3 — Testing, linting, CI/CD
- Jest/Supertest, ESLint, Docker, GitHub Actions

## Sprint 4 — Performance validation
- 300k-row benchmark seed, `scripts/benchmark.js`

## Sprint 5 — FoodClub curated marketplace
- Quality profiles, verification status, menu nutrition/allergens
- Discovery filters (dietary, quality score, Select-only, calories)
- FoodClub Select membership + customer dietary preferences
- Frontend: quality badges, nutrition panels, Select page

## Sprint 6 — Bengaluru launch + admin verification
- Bengaluru-only service area with “coming to your city soon” for other cities
- INR pricing throughout (₹ menu prices, ₹40 delivery, Select benefits)
- Bengaluru restaurant seed (EatFit, Salad Days, Lean Crust, etc.)
- Admin role + verification API (`/api/v1/admin/restaurants/*`)
- Admin dashboard at `/admin` for pending restaurant approval
- Auto-apply saved dietary preferences on Discover page

## Sprint 7 — Checkout gating + verification workflow
- Cart & Payment blocked outside Bengaluru (Coming Soon screen)
- Add-to-cart blocked with city message on restaurant detail
- Cart/Payment pricing aligned with backend (5% GST, ₹40 delivery, Select 5% off + free delivery)
- Restaurant verification submission at `/restaurant/verification` (evidence URLs per criterion)
- Admin queue shows submitted evidence + review notes on verify/reject
- Migration `006_verification_requests.sql`

**Try verification flow:** login as `yogurberry@example.com` / `password123` → Verification tab → submit evidence → review as admin.

## Sprint 8 — Order nutrition history + confirmation notifications
- Migration `007_order_item_nutrition.sql` — snapshot calories/macros/tags on `order_items` at checkout
- Backend enriches cart line items from menu before insert; `nutritionSummary` on order API responses
- Orders page shows per-order and per-item nutrition from snapshots
- Order confirmed in-app notification includes total kcal + protein
- Notification bell in navbar (`GET /api/v1/me/notifications`)
- Landing hero food carousel with ‹ › navigation (healthy dishes, ₹ prices)
- Restaurant dashboard quality score + verification widget

## Sprint 9 — Landing redesign + 24 Bengaluru partners + perf
- Landing page matches QuickBite reference layout (green/white, no motion effects)
- 24 Bengaluru restaurants seeded — all 6 categories populated with images + nutrition
- In-process TTL cache on list/discover/nearby (45–120s)
- Migration `008_perf_indexes.sql` — city, category, quality score indexes
- Single haversine pass on nearby query; home feed deferred via `requestIdleCallback`
- Images sized at w=640/q=80; hero image `fetchPriority="high"`
- Run `npm run measure-api` (backend up) for p50/p95 latency numbers

**Dev logins (after `node scripts/seed.js`):**
- Customer (Select): `priya@example.com` / `password123`
- Admin: `admin@foodclub.in` / `password123`
- Pending partner: `yogurberry@example.com` / `password123`
