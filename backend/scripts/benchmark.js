/**
 * Measures the actual latency impact of the indexes added in
 * 001_init_schema.sql, on the ~300k-row synthetic dataset from
 * `npm run seed:benchmark`.
 *
 * Methodology: for each query, run it repeatedly against real, randomly
 * sampled ids from the seeded data (so the planner/cache can't just serve
 * one memoized plan), once with the index in place and once with it
 * dropped, then report wall-clock latency as observed by the app (i.e.
 * time around pool.query(), not just the DB's internal EXPLAIN ANALYZE
 * time - that includes network + driver overhead, which is what a user
 * actually waits on). The first WARMUP_ITERATIONS of each run are
 * discarded so a cold connection/cache doesn't skew the numbers.
 *
 * Usage: npm run seed:benchmark && npm run benchmark
 */
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/db');

const ITERATIONS = 300;
const WARMUP_ITERATIONS = 20;

function percentile(sortedMs, p) {
  const idx = Math.min(sortedMs.length - 1, Math.floor((p / 100) * sortedMs.length));
  return sortedMs[idx];
}

function summarize(samplesMs) {
  const sorted = [...samplesMs].sort((a, b) => a - b);
  const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  return {
    avgMs: Number(avg.toFixed(3)),
    p50Ms: Number(percentile(sorted, 50).toFixed(3)),
    p95Ms: Number(percentile(sorted, 95).toFixed(3)),
    p99Ms: Number(percentile(sorted, 99).toFixed(3)),
  };
}

async function timeQuery(sql, paramsFn, iterations) {
  const samples = [];
  for (let i = 0; i < iterations; i++) {
    const params = paramsFn();
    const start = process.hrtime.bigint();
    // eslint-disable-next-line no-await-in-loop
    await pool.query(sql, params);
    const end = process.hrtime.bigint();
    if (i >= WARMUP_ITERATIONS) {
      samples.push(Number(end - start) / 1e6); // ns -> ms
    }
  }
  return summarize(samples);
}

async function getSampleIds(table, column, n) {
  const { rows } = await pool.query(
    `SELECT ${column} AS id FROM ${table} ORDER BY random() LIMIT $1`,
    [n]
  );
  return rows.map((r) => r.id);
}

async function dropIndex(name) {
  await pool.query(`DROP INDEX IF EXISTS ${name}`);
}

async function recreateIndexes() {
  // Re-applies the exact index definitions from the migration, so the
  // schema is left exactly as it started regardless of which subset was
  // dropped for a given query's "without index" measurement.
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders (user_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders (restaurant_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status ON orders (restaurant_id, status)`);
  await pool.query(`ANALYZE orders`);
}

async function benchmarkOrdersByUser(userIds) {
  const sql = `SELECT id, status, total_amount, created_at FROM orders WHERE user_id = $1 ORDER BY created_at DESC`;
  let i = 0;
  const paramsFn = () => [userIds[i++ % userIds.length]];

  await recreateIndexes();
  const withIndex = await timeQuery(sql, paramsFn, ITERATIONS);

  await dropIndex('idx_orders_user_id');
  await pool.query('ANALYZE orders');
  i = 0;
  const withoutIndex = await timeQuery(sql, paramsFn, ITERATIONS);

  await recreateIndexes();
  return { name: 'Get a user\'s orders (WHERE user_id = $1 ORDER BY created_at DESC)', withIndex, withoutIndex };
}

async function benchmarkOrdersByRestaurantAndStatus(restaurantIds) {
  const activeStatuses = [
    'payment_pending', 'confirmed', 'restaurant_accepted', 'preparing', 'ready_for_pickup', 'out_for_delivery',
  ];
  const sql = `SELECT id, status, total_amount, created_at FROM orders
               WHERE restaurant_id = $1 AND status = ANY($2::varchar[]) ORDER BY created_at DESC`;
  let i = 0;
  const paramsFn = () => [restaurantIds[i++ % restaurantIds.length], activeStatuses];

  await recreateIndexes();
  const withIndex = await timeQuery(sql, paramsFn, ITERATIONS);

  await dropIndex('idx_orders_restaurant_status');
  await dropIndex('idx_orders_restaurant_id');
  await pool.query('ANALYZE orders');
  i = 0;
  const withoutIndex = await timeQuery(sql, paramsFn, ITERATIONS);

  await recreateIndexes();
  return {
    name: 'Restaurant dashboard active orders (WHERE restaurant_id = $1 AND status = ANY($2))',
    withIndex,
    withoutIndex,
  };
}

function formatResult(result) {
  const pct = (before, after) => (((before - after) / before) * 100).toFixed(1);
  const lines = [
    `## ${result.name}`,
    '',
    '| metric | without index | with index | improvement |',
    '|---|---|---|---|',
    `| avg | ${result.withoutIndex.avgMs} ms | ${result.withIndex.avgMs} ms | ${pct(result.withoutIndex.avgMs, result.withIndex.avgMs)}% |`,
    `| p50 | ${result.withoutIndex.p50Ms} ms | ${result.withIndex.p50Ms} ms | ${pct(result.withoutIndex.p50Ms, result.withIndex.p50Ms)}% |`,
    `| p95 | ${result.withoutIndex.p95Ms} ms | ${result.withIndex.p95Ms} ms | ${pct(result.withoutIndex.p95Ms, result.withIndex.p95Ms)}% |`,
    `| p99 | ${result.withoutIndex.p99Ms} ms | ${result.withIndex.p99Ms} ms | ${pct(result.withoutIndex.p99Ms, result.withIndex.p99Ms)}% |`,
    '',
  ];
  return lines.join('\n');
}

async function main() {
  const { rows: countRows } = await pool.query('SELECT COUNT(*)::int AS n FROM orders');
  if (countRows[0].n < 50000) {
    console.error(
      `Only ${countRows[0].n} orders in the database. Run "npm run seed:benchmark" first ` +
        `(seeds ~300k orders) so the without-index case is actually slow enough to measure meaningfully.`
    );
    process.exit(1);
  }
  console.log(`Benchmarking against ${countRows[0].n} orders...\n`);

  const userIds = await getSampleIds('users', 'id', 500);
  const restaurantIds = await getSampleIds('restaurants', 'id', 200);

  const results = [];
  results.push(await benchmarkOrdersByUser(userIds));
  results.push(await benchmarkOrdersByRestaurantAndStatus(restaurantIds));

  let report = `# Benchmark results\n\nGenerated ${new Date().toISOString()} against ${countRows[0].n} orders.\n`;
  report += `Each figure is wall-clock time around \`pool.query()\` (network + driver + DB), `;
  report += `averaged over ${ITERATIONS - WARMUP_ITERATIONS} iterations after ${WARMUP_ITERATIONS} warm-up runs.\n\n`;
  for (const r of results) {
    console.log(formatResult(r));
    report += formatResult(r);
  }

  const outPath = path.join(__dirname, '..', '..', 'docs', 'BENCHMARK_RESULTS.md');
  fs.writeFileSync(outPath, report);
  console.log(`Full report written to ${outPath}`);

  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(1);
});
