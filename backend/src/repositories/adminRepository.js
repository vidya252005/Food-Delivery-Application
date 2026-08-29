const { pool } = require('../config/db');
const AppError = require('../utils/AppError');

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

module.exports = { setVerificationStatus };
