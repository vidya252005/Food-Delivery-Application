const { pool } = require('../config/db');

async function create({ name, email, issue }, client = pool) {
  const { rows } = await client.query(
    `INSERT INTO support_tickets (name, email, issue)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, issue, status, created_at`,
    [name, email, issue]
  );
  return rows[0];
}

/** Hits idx_support_tickets_created_at for the admin listing, newest first. */
async function findAll(client = pool) {
  const { rows } = await client.query(
    `SELECT id, name, email, issue, status, created_at FROM support_tickets ORDER BY created_at DESC`
  );
  return rows;
}

module.exports = { create, findAll };
