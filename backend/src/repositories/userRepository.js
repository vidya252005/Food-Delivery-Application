const { pool } = require('../config/db');

/**
 * Every query here is parameterized ($1, $2, ...) - values are sent
 * separately from the SQL text, so user input can never be interpreted
 * as SQL. String-concatenating request data into a query is exactly the
 * pattern that would reopen the class of bug this repository layer
 * exists to close off.
 */

/** Hits the idx_users_email unique B-tree index. */
const USER_COLS = `id, name, email, password_hash, google_id, avatar_url,
  street, city, state, zip_code, phone, latitude, longitude, role, created_at, updated_at`;

async function findByEmail(email, client = pool) {
  const { rows } = await client.query(
    `SELECT ${USER_COLS} FROM users WHERE email = $1`,
    [email]
  );
  return rows[0] || null;
}

async function findByGoogleId(googleId, client = pool) {
  const { rows } = await client.query(
    `SELECT ${USER_COLS} FROM users WHERE google_id = $1`,
    [googleId]
  );
  return rows[0] || null;
}

async function findById(id, client = pool) {
  const { rows } = await client.query(
    `SELECT ${USER_COLS} FROM users WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function create({ name, email, passwordHash, phone }, client = pool) {
  const { rows } = await client.query(
    `INSERT INTO users (name, email, password_hash, phone)
     VALUES ($1, $2, $3, $4)
     RETURNING ${USER_COLS}`,
    [name, email, passwordHash, phone || null]
  );
  return rows[0];
}

async function createOAuthUser({ name, email, googleId, avatarUrl }, client = pool) {
  const { rows } = await client.query(
    `INSERT INTO users (name, email, google_id, avatar_url, city, state)
     VALUES ($1, $2, $3, $4, 'Bengaluru', 'Karnataka')
     RETURNING ${USER_COLS}`,
    [name, email, googleId, avatarUrl || null]
  );
  return rows[0];
}

async function linkGoogle(id, { googleId, avatarUrl, name }, client = pool) {
  const { rows } = await client.query(
    `UPDATE users SET google_id = $1, avatar_url = COALESCE($2, avatar_url),
       name = COALESCE($3, name), updated_at = now()
     WHERE id = $4 RETURNING ${USER_COLS}`,
    [googleId, avatarUrl || null, name || null, id]
  );
  return rows[0];
}

async function updateLocation(id, { latitude, longitude }, client = pool) {
  const { rows } = await client.query(
    `UPDATE users SET latitude = $1, longitude = $2, updated_at = now()
     WHERE id = $3 RETURNING ${USER_COLS}`,
    [latitude, longitude, id]
  );
  return rows[0];
}

module.exports = {
  findByEmail,
  findByGoogleId,
  findById,
  create,
  createOAuthUser,
  linkGoogle,
  updateLocation,
};
