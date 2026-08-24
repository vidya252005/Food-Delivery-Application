const { pool } = require('../config/db');

async function findAvailableNear(lat, lng, radiusKm = 10, client = pool) {
  const { rows } = await client.query(
    `SELECT id, name, email, phone, status, latitude, longitude, rating
     FROM delivery_partners
     WHERE is_active = true AND status = 'available'
       AND latitude IS NOT NULL AND longitude IS NOT NULL
       AND (6371 * acos(LEAST(1.0,
         cos(radians($1)) * cos(radians(latitude)) *
         cos(radians(longitude) - radians($2)) +
         sin(radians($1)) * sin(radians(latitude))
       ))) <= $3`,
    [lat, lng, radiusKm]
  );
  return rows;
}

async function findById(id, client = pool) {
  const { rows } = await client.query(
    `SELECT id, name, email, phone, status, latitude, longitude, rating FROM delivery_partners WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function findByEmail(email, client = pool) {
  const { rows } = await client.query(
    `SELECT id, name, email, phone, password_hash, status, latitude, longitude, rating
     FROM delivery_partners WHERE email = $1`,
    [email]
  );
  return rows[0] || null;
}

async function updateStatus(id, status, client = pool) {
  const { rows } = await client.query(
    `UPDATE delivery_partners SET status = $1, updated_at = now() WHERE id = $2 RETURNING *`,
    [status, id]
  );
  return rows[0] || null;
}

async function updateLocation(id, lat, lng, client = pool) {
  const { rows } = await client.query(
    `UPDATE delivery_partners SET latitude = $1, longitude = $2, updated_at = now() WHERE id = $3 RETURNING *`,
    [lat, lng, id]
  );
  return rows[0] || null;
}

async function create({ name, email, passwordHash, phone, lat, lng }, client = pool) {
  const { rows } = await client.query(
    `INSERT INTO delivery_partners (name, email, password_hash, phone, latitude, longitude, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'available')
     RETURNING id, name, email, phone, status, latitude, longitude, rating`,
    [name, email, passwordHash, phone, lat, lng]
  );
  return rows[0];
}

module.exports = {
  findAvailableNear, findById, findByEmail, updateStatus, updateLocation, create,
};
