/**
 * Hits the live, running API (must already be started separately - see
 * README) with concurrent connections and reports real latency
 * percentiles and throughput, via autocannon's Node API rather than
 * asserting a number.
 *
 * Usage: node scripts/loadtest.js [baseUrl]
 *        (defaults to http://localhost:5001)
 */
const fs = require('fs');
const path = require('path');
const autocannon = require('autocannon');
const { Pool } = require('pg');
const env = require('../src/config/env');

const baseUrl = process.argv[2] || `http://localhost:${env.PORT}`;

function run(opts) {
  return new Promise((resolve, reject) => {
    autocannon(opts, (err, result) => (err ? reject(err) : resolve(result)));
  });
}

function formatResult(label, opts, result) {
  const lat = result.latency;
  return [
    `## ${label}`,
    '',
    `${opts.connections} concurrent connections, ${opts.duration}s duration, ${result.requests.total} requests, ${result.errors} errors.`,
    '',
    '| metric | value |',
    '|---|---|',
    `| p50 latency | ${lat.p50} ms |`,
    `| p95 latency | ${lat.p97_5 ?? lat.p95} ms |`,
    `| p99 latency | ${lat.p99} ms |`,
    `| max latency | ${lat.max} ms |`,
    `| throughput | ${result.requests.average.toFixed(1)} req/sec (avg) |`,
    '',
  ].join('\n');
}

async function pickRealIds() {
  // Pool config is read straight from env so this connects to whichever
  // database the target server itself is using.
  const pool = new Pool({
    host: env.PG_HOST,
    port: env.PG_PORT,
    database: env.PG_DATABASE,
    user: env.PG_USER,
    password: env.PG_PASSWORD,
  });
  const { rows: users } = await pool.query('SELECT id FROM users LIMIT 1');
  const { rows: restaurants } = await pool.query('SELECT id FROM restaurants LIMIT 1');
  const { rows: menuItems } = await pool.query(
    'SELECT id, name, price FROM menu_items WHERE restaurant_id = $1 LIMIT 1',
    [restaurants[0].id]
  );
  await pool.end();
  const jwt = require('jsonwebtoken');
  const userToken = jwt.sign({ id: users[0].id, role: 'user' }, env.JWT_SECRET, { expiresIn: '1h' });
  return { userId: users[0].id, restaurantId: restaurants[0].id, menuItem: menuItems[0], userToken };
}

async function main() {
  console.log(`Load testing ${baseUrl} ...`);

  const health = await run({ url: `${baseUrl}/health`, connections: 1, duration: 1 });
  if (health.errors > 0 || health['2xx'] === 0) {
    console.error(`Target at ${baseUrl} doesn't look healthy. Is the server running?`);
    process.exit(1);
  }

  const { userId, restaurantId, menuItem, userToken } = await pickRealIds();
  const orderBody = JSON.stringify({
    user: userId,
    restaurant: restaurantId,
    items: [{ menuItem: menuItem.id, name: menuItem.name, price: Number(menuItem.price), quantity: 1 }],
    totalAmount: Number(menuItem.price),
    deliveryAddress: { street: '1 Load Test St', city: 'Bengaluru', state: 'KA', zipCode: '560001' },
  });

  const scenarios = [
    {
      label: 'GET /api/restaurants (read-heavy listing)',
      opts: { url: `${baseUrl}/api/restaurants`, connections: 50, duration: 6 },
    },
    {
      label: 'GET /api/restaurants/:id (single restaurant + menu JOIN)',
      opts: { url: `${baseUrl}/api/restaurants/${restaurantId}`, connections: 50, duration: 6 },
    },
    {
      label: 'POST /api/orders (transactional write — requires user JWT)',
      opts: {
        url: `${baseUrl}/api/orders`,
        connections: 50,
        duration: 6,
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${userToken}`,
        },
        body: orderBody,
      },
    },
  ];

  let report = `# Load test results\n\nGenerated ${new Date().toISOString()} against ${baseUrl}.\n\n`;
  for (const scenario of scenarios) {
    console.log(`\nRunning: ${scenario.label} (${scenario.opts.connections} connections, ${scenario.opts.duration}s)...`);
    // eslint-disable-next-line no-await-in-loop
    const result = await run(scenario.opts);
    const formatted = formatResult(scenario.label, scenario.opts, result);
    console.log(formatted);
    report += formatted;
  }

  const outPath = path.join(__dirname, '..', '..', 'docs', 'LOADTEST_RESULTS.md');
  fs.writeFileSync(outPath, report);
  console.log(`Full report written to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
