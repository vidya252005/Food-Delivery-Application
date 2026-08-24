const { pool } = require('../config/db');

/** Hits the unique idx_feedback_order_id - also enforces "one feedback per order". */
async function findByOrderId(orderId, client = pool) {
  const { rows } = await client.query(
    `SELECT f.id, f.order_id, f.user_id, f.restaurant_id, f.rating, f.food_quality,
            f.delivery_speed, f.comment, f.created_at, f.updated_at,
            u.name AS user_name, r.name AS restaurant_name
     FROM feedback f
     JOIN users u ON u.id = f.user_id
     JOIN restaurants r ON r.id = f.restaurant_id
     WHERE f.order_id = $1`,
    [orderId]
  );
  return rows[0] || null;
}

/** Hits idx_feedback_restaurant_id; latest first. */
async function findByRestaurant(restaurantId, client = pool) {
  const { rows } = await client.query(
    `SELECT f.id, f.order_id, f.user_id, f.restaurant_id, f.rating, f.food_quality,
            f.delivery_speed, f.comment, f.created_at, f.updated_at,
            u.name AS user_name
     FROM feedback f
     JOIN users u ON u.id = f.user_id
     WHERE f.restaurant_id = $1
     ORDER BY f.created_at DESC`,
    [restaurantId]
  );
  return rows;
}

async function create({ orderId, userId, restaurantId, rating, foodQuality, deliverySpeed, comment }, client = pool) {
  const { rows } = await client.query(
    `INSERT INTO feedback (order_id, user_id, restaurant_id, rating, food_quality, delivery_speed, comment)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, order_id, user_id, restaurant_id, rating, food_quality, delivery_speed, comment, created_at, updated_at`,
    [orderId, userId, restaurantId, rating, foodQuality || null, deliverySpeed || null, comment || null]
  );
  return rows[0];
}

module.exports = { findByOrderId, findByRestaurant, create };
