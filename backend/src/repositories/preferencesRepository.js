const { pool } = require('../config/db');

async function findByUserId(userId, client = pool) {
  const { rows } = await client.query(
    `SELECT user_id, dietary_tags, allergens_to_avoid, max_calories, min_protein_g, updated_at
     FROM customer_dietary_preferences WHERE user_id = $1`,
    [userId]
  );
  return rows[0] || null;
}

async function upsert(userId, prefs, client = pool) {
  const { rows } = await client.query(
    `INSERT INTO customer_dietary_preferences
       (user_id, dietary_tags, allergens_to_avoid, max_calories, min_protein_g, updated_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (user_id) DO UPDATE SET
       dietary_tags = EXCLUDED.dietary_tags,
       allergens_to_avoid = EXCLUDED.allergens_to_avoid,
       max_calories = EXCLUDED.max_calories,
       min_protein_g = EXCLUDED.min_protein_g,
       updated_at = now()
     RETURNING user_id, dietary_tags, allergens_to_avoid, max_calories, min_protein_g, updated_at`,
    [
      userId,
      prefs.dietaryTags || [],
      prefs.allergensToAvoid || [],
      prefs.maxCalories ?? null,
      prefs.minProteinGrams ?? null,
    ]
  );
  return rows[0];
}

module.exports = { findByUserId, upsert };
