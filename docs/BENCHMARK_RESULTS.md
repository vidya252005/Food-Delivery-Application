# Benchmark results

Generated 2026-08-24T12:08:11.515Z against 300000 orders.
Each figure is wall-clock time around `pool.query()` (network + driver + DB), averaged over 280 iterations after 20 warm-up runs.

## Get a user's orders (WHERE user_id = $1 ORDER BY created_at DESC)

| metric | without index | with index | improvement |
|---|---|---|---|
| avg | 33.448 ms | 1.289 ms | 96.1% |
| p50 | 26.922 ms | 1.16 ms | 95.7% |
| p95 | 62.792 ms | 2.229 ms | 96.5% |
| p99 | 96.664 ms | 2.911 ms | 97.0% |
## Restaurant dashboard active orders (WHERE restaurant_id = $1 AND status = ANY($2))

| metric | without index | with index | improvement |
|---|---|---|---|
| avg | 49.14 ms | 12.466 ms | 74.6% |
| p50 | 43.32 ms | 14.309 ms | 67.0% |
| p95 | 78.264 ms | 26.369 ms | 66.3% |
| p99 | 134.203 ms | 48.451 ms | 63.9% |
