/**
 * Quick local latency report for portfolio / README numbers.
 * Usage: node scripts/measure-api.js
 */
const http = require('http');

const BASE = process.env.API_URL || 'http://localhost:5001';
const SAMPLES = 20;

function get(path) {
  return new Promise((resolve, reject) => {
    const start = process.hrtime.bigint();
    http.get(`${BASE}${path}`, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        const ms = Number(process.hrtime.bigint() - start) / 1e6;
        resolve({ ms, status: res.statusCode, bytes: body.length });
      });
    }).on('error', reject);
  });
}

function percentile(sorted, p) {
  const i = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, i)];
}

async function bench(label, path) {
  const times = [];
  for (let i = 0; i < SAMPLES; i++) {
    // eslint-disable-next-line no-await-in-loop
    const r = await get(path);
    if (r.status >= 400) throw new Error(`${label} HTTP ${r.status}`);
    times.push(r.ms);
  }
  times.sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  console.log(
    `${label.padEnd(28)} avg ${avg.toFixed(1)}ms  p50 ${percentile(times, 50).toFixed(1)}ms  p95 ${percentile(times, 95).toFixed(1)}ms`
  );
}

async function main() {
  console.log(`FoodClub API latency (${SAMPLES} samples each) → ${BASE}\n`);
  await bench('GET /health', '/health');
  await bench('GET /api/restaurants', '/api/restaurants');
  await bench('GET /api/v1/home', '/api/v1/home?lat=12.9352&lng=77.6245');
  await bench('GET /api/v1/discover', '/api/v1/discover?lat=12.9352&lng=77.6245');
  await bench('GET /api/restaurants/nearby', '/api/restaurants/nearby?lat=12.9352&lng=77.6245');
}

main().catch((err) => {
  console.error('Ensure backend is running:', err.message);
  process.exit(1);
});
