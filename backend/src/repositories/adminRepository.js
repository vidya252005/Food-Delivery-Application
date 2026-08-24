const { pool } = require('../config/db');
const AppError = require('../utils/AppError');

async function listPending(client = pool) {
  const { rows } = await client.query(
    `SELECT r.id, r.name, r.email, r.cuisine, r.street, r.city, r.verification_status,
            r.description, r.rating, r.created_at,
            qp.overall_score AS qp_overall_score
     FROM restaurants r
     LEFT JOIN quality_profiles qp ON qp.restaurant_id = r.id
     WHERE r.verification_status IN ('pending', 'rejected')
     ORDER BY r.created_at DESC`
  );
  return rows;
}

async function setVerificationStatus(restaurantId, status, client = pool) {
  const allowed = ['pending', 'verified', 'rejected', 'expired'];
  if (!allowed.includes(status)) throw new AppError('Invalid verification status', 400);

  const { rows } = await client.query(
    `UPDATE restaurants SET verification_status = $1, updated_at = now()
     WHERE id = $2
     RETURNING id, name, verification_status`,
    [status, restaurantId]
  );
  return rows[0] || null;
}

module.exports = { listPending, setVerificationStatus };
