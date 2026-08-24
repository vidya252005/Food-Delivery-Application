const { pool } = require('../config/db');
const { MembershipTier, MembershipStatus } = require('../domain/enums');

async function findActiveByUserId(userId, client = pool) {
  const { rows } = await client.query(
    `SELECT id, user_id, tier, status, start_date, expiry_date, created_at, updated_at
     FROM memberships
     WHERE user_id = $1 AND status = 'active'
       AND (expiry_date IS NULL OR expiry_date > now())
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

async function subscribe(userId, tier = MembershipTier.SELECT, client = pool) {
  await client.query(
    `UPDATE memberships SET status = 'cancelled', updated_at = now()
     WHERE user_id = $1 AND status = 'active'`,
    [userId]
  );
  const expiry = new Date();
  expiry.setFullYear(expiry.getFullYear() + 1);
  const { rows } = await client.query(
    `INSERT INTO memberships (user_id, tier, status, start_date, expiry_date)
     VALUES ($1, $2, 'active', now(), $3)
     RETURNING id, user_id, tier, status, start_date, expiry_date, created_at, updated_at`,
    [userId, tier, expiry]
  );
  return rows[0];
}

async function cancel(userId, client = pool) {
  const { rows } = await client.query(
    `UPDATE memberships SET status = 'cancelled', updated_at = now()
     WHERE user_id = $1 AND status = 'active'
     RETURNING id, user_id, tier, status, start_date, expiry_date, created_at, updated_at`,
    [userId]
  );
  return rows[0] || null;
}

async function isSelectMember(userId, client = pool) {
  const row = await findActiveByUserId(userId, client);
  return row?.tier === MembershipTier.SELECT && row?.status === MembershipStatus.ACTIVE;
}

module.exports = {
  findActiveByUserId,
  subscribe,
  cancel,
  isSelectMember,
};
