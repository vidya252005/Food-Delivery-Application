# Load test results

Generated 2026-08-24T12:08:20.389Z against http://localhost:5001.

## GET /api/restaurants (read-heavy listing)

50 concurrent connections, 6s duration, 14643 requests, 0 errors.

| metric | value |
|---|---|
| p50 latency | 13 ms |
| p95 latency | 68 ms |
| p99 latency | 106 ms |
| max latency | 1074 ms |
| throughput | 2441.0 req/sec (avg) |
## GET /api/restaurants/:id (single restaurant + menu JOIN)

50 concurrent connections, 6s duration, 14454 requests, 0 errors.

| metric | value |
|---|---|
| p50 latency | 16 ms |
| p95 latency | 51 ms |
| p99 latency | 69 ms |
| max latency | 150 ms |
| throughput | 2409.5 req/sec (avg) |
## POST /api/orders (transactional write — requires user JWT)

50 concurrent connections, 6s duration, 10780 requests, 0 errors.

| metric | value |
|---|---|
| p50 latency | 19 ms |
| p95 latency | 118 ms |
| p99 latency | 142 ms |
| max latency | 664 ms |
| throughput | 1797.0 req/sec (avg) |
