const { pool } = require('../config/db');

async function findByOrderId(orderId, client = pool) {
  const { rows } = await client.query(
    `SELECT d.*, dp.name AS partner_name, dp.phone AS partner_phone,
            dp.latitude AS partner_lat, dp.longitude AS partner_lng
     FROM deliveries d
     LEFT JOIN delivery_partners dp ON dp.id = d.partner_id
     WHERE d.order_id = $1`,
    [orderId]
  );
  return rows[0] || null;
}

async function create({ orderId, pickupLat, pickupLng, dropLat, dropLng }, client = pool) {
  const { rows } = await client.query(
    `INSERT INTO deliveries (order_id, pickup_lat, pickup_lng, drop_lat, drop_lng, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     RETURNING *`,
    [orderId, pickupLat, pickupLng, dropLat, dropLng]
  );
  return rows[0];
}

async function assignPartner(deliveryId, partnerId, client = pool) {
  const { rows } = await client.query(
    `UPDATE deliveries SET partner_id = $1, status = 'assigned', updated_at = now()
     WHERE id = $2 RETURNING *`,
    [partnerId, deliveryId]
  );
  return rows[0] || null;
}

async function updateStatus(deliveryId, status, client = pool) {
  const { rows } = await client.query(
    `UPDATE deliveries SET status = $1, updated_at = now() WHERE id = $2 RETURNING *`,
    [status, deliveryId]
  );
  return rows[0] || null;
}

module.exports = { findByOrderId, create, assignPartner, updateStatus };
