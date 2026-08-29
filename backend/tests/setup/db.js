const { pool } = require('../../src/config/db');
const { apiCache } = require('../../src/utils/ttlCache');

/** Wipes every table between tests so one test's data can't leak into the next. */
async function resetDb() {
  apiCache.store.clear();
  await pool.query(
    `TRUNCATE feedback, order_items, orders, menu_items, restaurants, users, support_tickets, schema_migrations RESTART IDENTITY CASCADE`
  );
  // schema_migrations gets truncated above for simplicity, so re-mark the
  // one migration we have as applied (harmless if migrate.js runs again).
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
  await pool.query(`INSERT INTO schema_migrations (filename) VALUES ('001_init_schema.sql') ON CONFLICT DO NOTHING`);
}

async function closeDb() {
  await pool.end();
}

module.exports = { resetDb, closeDb };
