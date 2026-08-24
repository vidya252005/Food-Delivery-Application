const { Pool } = require('pg');
const env = require('./env');

/**
 * A single shared connection pool for the process. `pg.Pool` maintains a
 * set of live TCP connections to Postgres and hands them out to queries
 * on demand instead of opening/closing a socket + re-running TLS/auth
 * handshake per request - that per-request handshake is the single
 * biggest source of avoidable latency in a naive DB client, especially
 * under concurrent load.
 *
 *   max                  - hard ceiling on simultaneous connections. Set
 *                           well under Postgres's own `max_connections`
 *                           (100 by default) so N app instances can't
 *                           collectively starve the DB.
 *   idleTimeoutMillis     - close idle clients after this long, so the
 *                           pool shrinks back down during quiet periods
 *                           instead of holding 20 idle sockets forever.
 *   connectionTimeoutMillis - how long a query is willing to wait for a
 *                           free client before failing fast. Without this
 *                           a traffic spike queues requests indefinitely
 *                           instead of surfacing backpressure.
 */
const pool = new Pool({
  host: env.PG_HOST,
  port: env.PG_PORT,
  database: env.PG_DATABASE,
  user: env.PG_USER,
  password: env.PG_PASSWORD,
  max: env.PG_POOL_MAX,
  min: env.PG_POOL_MIN,
  idleTimeoutMillis: env.PG_IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: env.PG_CONN_TIMEOUT_MS,
  ssl: env.PG_SSL ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (err) => {
  // Fired when an *idle* client in the pool hits an error (e.g. the
  // network drops). Without this handler that error is unhandled and
  // crashes the whole process.
  console.error('Unexpected error on idle PG client', err);
});

/** Snapshot of pool utilization, exposed on /health for observability. */
function poolStats() {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
    max: env.PG_POOL_MAX,
  };
}

/**
 * Run `fn` with a single client checked out of the pool for the whole
 * callback, wrapped in a transaction. Use this whenever more than one
 * statement must succeed or fail together (e.g. creating an order and
 * its line items). Every other query should go through `pool.query`
 * directly so it can grab whichever client is free.
 */
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, poolStats, withTransaction };
