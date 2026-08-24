const { pool } = require('../config/db');

async function create({ userId, orderId, title, body, channel = 'in_app' }, client = pool) {
  const { rows } = await client.query(
    `INSERT INTO notifications (user_id, order_id, channel, title, body)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, user_id, order_id, title, body, read, created_at`,
    [userId, orderId, channel, title, body]
  );
  return rows[0];
}

async function findByUser(userId, client = pool) {
  const { rows } = await client.query(
    `SELECT id, order_id, title, body, read, created_at
     FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [userId]
  );
  return rows.map((row) => ({
    id: row.id,
    _id: row.id,
    orderId: row.order_id,
    title: row.title,
    body: row.body,
    read: row.read,
    createdAt: row.created_at,
  }));
}

module.exports = { create, findByUser };
