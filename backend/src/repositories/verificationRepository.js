const { pool } = require('../config/db');

async function createSubmission({ restaurantId, criteria, notes }, client = pool) {
  const { rows } = await client.query(
    `INSERT INTO restaurant_verification_requests (restaurant_id, criteria, notes, status)
     VALUES ($1, $2, $3, 'pending')
     RETURNING id, restaurant_id, criteria, notes, status, submitted_at`,
    [restaurantId, JSON.stringify(criteria), notes || null]
  );
  return rows[0];
}

async function findLatestByRestaurant(restaurantId, client = pool) {
  const { rows } = await client.query(
    `SELECT id, restaurant_id, criteria, notes, status, submitted_at, reviewed_at, review_notes
     FROM restaurant_verification_requests
     WHERE restaurant_id = $1
     ORDER BY submitted_at DESC
     LIMIT 1`,
    [restaurantId]
  );
  return rows[0] || null;
}

async function findPendingWithRestaurants(client = pool) {
  const { rows } = await client.query(
    `SELECT r.id, r.name, r.email, r.verification_status, r.description, r.city,
            qp.overall_score AS qp_overall_score,
            v.id AS request_id, v.criteria, v.notes AS request_notes,
            v.status AS request_status, v.submitted_at
     FROM restaurants r
     LEFT JOIN quality_profiles qp ON qp.restaurant_id = r.id
     LEFT JOIN LATERAL (
       SELECT id, criteria, notes, status, submitted_at
       FROM restaurant_verification_requests
       WHERE restaurant_id = r.id
       ORDER BY submitted_at DESC
       LIMIT 1
     ) v ON true
     WHERE r.verification_status IN ('pending', 'rejected')
        OR v.status = 'pending'
     ORDER BY v.submitted_at DESC NULLS LAST, r.name`
  );
  return rows;
}

async function markReviewed(requestId, { status, reviewedBy, reviewNotes }, client = pool) {
  const { rows } = await client.query(
    `UPDATE restaurant_verification_requests
     SET status = $1, reviewed_at = now(), reviewed_by = $2, review_notes = $3
     WHERE id = $4
     RETURNING id, restaurant_id, status, reviewed_at`,
    [status, reviewedBy, reviewNotes || null, requestId]
  );
  return rows[0] || null;
}

module.exports = {
  createSubmission,
  findLatestByRestaurant,
  findPendingWithRestaurants,
  markReviewed,
};
