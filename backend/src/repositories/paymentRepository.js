const { pool } = require('../config/db');

async function findByIdempotencyKey(key, client = pool) {
  const { rows } = await client.query(
    `SELECT id, order_id, amount_paise, currency, method, status, transaction_id, idempotency_key, created_at
     FROM payments WHERE idempotency_key = $1`,
    [key]
  );
  return rows[0] || null;
}

async function findByOrderId(orderId, client = pool) {
  const { rows } = await client.query(
    `SELECT id, order_id, amount_paise, currency, method, status, transaction_id, idempotency_key, created_at
     FROM payments WHERE order_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [orderId]
  );
  return rows[0] || null;
}

async function create({
  orderId, amountPaise, method, status, transactionId, idempotencyKey,
}, client = pool) {
  const { rows } = await client.query(
    `INSERT INTO payments (order_id, amount_paise, method, status, transaction_id, idempotency_key)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, order_id, amount_paise, currency, method, status, transaction_id, idempotency_key, created_at`,
    [orderId, amountPaise, method, status, transactionId || null, idempotencyKey]
  );
  return rows[0];
}

async function updateStatus(id, status, transactionId = null, client = pool) {
  const { rows } = await client.query(
    `UPDATE payments SET status = $1, transaction_id = COALESCE($2, transaction_id), updated_at = now()
     WHERE id = $3
     RETURNING id, order_id, amount_paise, method, status, transaction_id, idempotency_key`,
    [status, transactionId, id]
  );
  return rows[0] || null;
}

module.exports = { findByIdempotencyKey, findByOrderId, create, updateStatus };
