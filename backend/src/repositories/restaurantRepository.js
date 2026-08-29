const { pool } = require('../config/db');
const selectEligibilityService = require('../services/selectEligibilityService');

async function findByEmail(email, client = pool) {
  const { rows } = await client.query(
    `SELECT id, name, email, password_hash, cuisine, street, city, state, zip_code, phone,
            image, delivery_time, min_order, rating, is_active, created_at, updated_at
     FROM restaurants WHERE email = $1`,
    [email]
  );
  return rows[0] || null;
}

async function findById(id, client = pool) {
  const { rows } = await client.query(
    `SELECT ${RESTAURANT_COLS}, ${QUALITY_COLS}
     ${RESTAURANT_FROM} WHERE r.id = $1`,
    [id]
  );
  return rows[0] || null;
}

const MENU_ITEM_COLS = `id, restaurant_id, name, description, price, category, image, available,
  calories, protein_g, carbs_g, fat_g, sugar_g, fiber_g, dietary_tags, allergens, prep_time_minutes`;

async function getMenu(restaurantId, client = pool) {
  const { rows } = await client.query(
    `SELECT ${MENU_ITEM_COLS}
     FROM menu_items WHERE restaurant_id = $1 ORDER BY category, name`,
    [restaurantId]
  );
  return rows;
}

/** Active restaurant listing - hits idx_restaurants_is_active. */
const RESTAURANT_COLS = `r.id, r.name, r.email, r.cuisine, r.street, r.city, r.state, r.zip_code, r.phone,
  r.image, r.delivery_time, r.min_order, r.rating, r.is_active, r.latitude, r.longitude,
  r.description, r.verification_status, r.supported_dietary_tags,
  r.created_at, r.updated_at`;

const QUALITY_COLS = `qp.overall_score AS qp_overall_score,
  qp.ingredient_score AS qp_ingredient_score,
  qp.transparency_score AS qp_transparency_score,
  qp.food_safety_score AS qp_food_safety_score,
  qp.consistency_score AS qp_consistency_score,
  qp.badges AS qp_badges`;

const RESTAURANT_FROM = `FROM restaurants r
  LEFT JOIN quality_profiles qp ON qp.restaurant_id = r.id`;

async function findActive(client = pool) {
  const { rows } = await client.query(
    `SELECT ${RESTAURANT_COLS}, ${QUALITY_COLS}
     ${RESTAURANT_FROM}
     WHERE r.is_active = true
     ORDER BY COALESCE(qp.overall_score, 0) DESC, r.name`
  );
  return rows;
}

async function findNearby(lat, lng, radiusKm = 15, client = pool) {
  const { rows } = await client.query(
    `SELECT * FROM (
       SELECT ${RESTAURANT_COLS}, ${QUALITY_COLS},
         (6371 * acos(LEAST(1.0,
           cos(radians($1)) * cos(radians(r.latitude)) *
           cos(radians(r.longitude) - radians($2)) +
           sin(radians($1)) * sin(radians(r.latitude))
         ))) AS distance_km
       ${RESTAURANT_FROM}
       WHERE r.is_active = true
         AND r.latitude IS NOT NULL AND r.longitude IS NOT NULL
     ) nearby
     WHERE distance_km <= $3
     ORDER BY distance_km ASC`,
    [lat, lng, radiusKm]
  );
  return rows;
}

/**
 * Search across restaurant name, cuisine, and menu item names.
 * Prefix matches (the common case for a search-as-you-type box) use
 * `ILIKE 'term%'`, which - unlike a leading-wildcard `%term%` - Postgres
 * can still satisfy with the existing B-tree indexes on name. A
 * leading-wildcard substring match falls back to a sequential scan
 * (a trigram/GIN index would fix that; noted in ARCHITECTURE.md as a
 * follow-up since it's a different index family from the b-tree work
 * this pass focuses on).
 */
async function search(term, client = pool) {
  const pattern = `${term}%`;
  const { rows } = await client.query(
    `SELECT ${RESTAURANT_COLS}, ${QUALITY_COLS}
     ${RESTAURANT_FROM}
     WHERE r.is_active = true AND (
       r.name ILIKE $1
       OR EXISTS (
         SELECT 1 FROM unnest(r.cuisine) AS cuisine_tag(tag)
         WHERE tag ILIKE $1
       )
       OR EXISTS (
         SELECT 1 FROM menu_items mi
         WHERE mi.restaurant_id = r.id AND mi.name ILIKE $1
       )
     )
     ORDER BY COALESCE(qp.overall_score, 0) DESC, r.name`,
    [pattern]
  );
  return rows;
}

/**
 * Discovery search with dietary, quality, and Select filters.
 */
async function discover(filters = {}, client = pool) {
  const {
    keyword,
    lat,
    lng,
    radiusKm = 15,
    dietaryTags = [],
    excludedAllergens = [],
    minQualityScore,
    selectOnly = false,
    maxCalories,
  } = filters;

  const conditions = ['r.is_active = true'];
  const values = [];
  let i = 1;

  let distanceSelect = '';
  if (lat != null && lng != null) {
    distanceSelect = `, (6371 * acos(LEAST(1.0,
      cos(radians($${i})) * cos(radians(r.latitude)) *
      cos(radians(r.longitude) - radians($${i + 1})) +
      sin(radians($${i})) * sin(radians(r.latitude))
    ))) AS distance_km`;
    conditions.push('r.latitude IS NOT NULL AND r.longitude IS NOT NULL');
    conditions.push(`(6371 * acos(LEAST(1.0,
      cos(radians($${i})) * cos(radians(r.latitude)) *
      cos(radians(r.longitude) - radians($${i + 1})) +
      sin(radians($${i})) * sin(radians(r.latitude))
    ))) <= $${i + 2}`);
    values.push(lat, lng, radiusKm);
    i += 3;
  }

  if (keyword) {
    conditions.push(`(
      r.name ILIKE $${i} OR EXISTS (
        SELECT 1 FROM menu_items mi
        WHERE mi.restaurant_id = r.id AND mi.name ILIKE $${i}
      )
    )`);
    values.push(`%${keyword}%`);
    i += 1;
  }

  if (minQualityScore != null) {
    conditions.push(`COALESCE(qp.overall_score, 0) >= $${i++}`);
    values.push(minQualityScore);
  }

  if (selectOnly) {
    i = selectEligibilityService.appendSelectEligibleSqlConditions(conditions, values, i);
  }

  if (dietaryTags.length > 0) {
    conditions.push(`r.supported_dietary_tags && $${i++}::text[]`);
    values.push(dietaryTags);
  }

  if (excludedAllergens.length > 0) {
    conditions.push(`NOT EXISTS (
      SELECT 1 FROM menu_items mi
      WHERE mi.restaurant_id = r.id
        AND mi.available = true
        AND mi.allergens && $${i++}::text[]
    )`);
    values.push(excludedAllergens);
  }

  if (maxCalories != null) {
    conditions.push(`EXISTS (
      SELECT 1 FROM menu_items mi
      WHERE mi.restaurant_id = r.id
        AND mi.available = true
        AND mi.calories IS NOT NULL
        AND mi.calories <= $${i++}
    )`);
    values.push(maxCalories);
  }

  const orderBy = lat != null && lng != null
    ? 'distance_km ASC, COALESCE(qp.overall_score, 0) DESC'
    : 'COALESCE(qp.overall_score, 0) DESC, r.name';

  const { rows } = await client.query(
    `SELECT ${RESTAURANT_COLS}, ${QUALITY_COLS}${distanceSelect}
     ${RESTAURANT_FROM}
     WHERE ${conditions.join(' AND ')}
     ORDER BY ${orderBy}`,
    values
  );
  return rows;
}

async function findSelectEligible(lat, lng, radiusKm = 15, client = pool) {
  return discover({
    lat,
    lng,
    radiusKm,
    selectOnly: true,
  }, client);
}

async function create({ name, email, passwordHash, phone, cuisine, address, latitude, longitude }, client = pool) {
  const { rows } = await client.query(
    `INSERT INTO restaurants (name, email, password_hash, phone, cuisine, street, city, state, zip_code, latitude, longitude)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id, name, email, cuisine, street, city, state, zip_code, phone,
               image, delivery_time, min_order, rating, is_active, latitude, longitude,
               description, verification_status, supported_dietary_tags, created_at, updated_at`,
    [
      name,
      email,
      passwordHash,
      phone || null,
      cuisine || [],
      address?.street || null,
      address?.city || null,
      address?.state || null,
      address?.zipCode || null,
      latitude ?? null,
      longitude ?? null,
    ]
  );
  return rows[0];
}

async function createQualityProfile(restaurantId, client = pool) {
  await client.query(
    `INSERT INTO quality_profiles
       (restaurant_id, overall_score, ingredient_score, transparency_score, food_safety_score, consistency_score, badges)
     VALUES ($1, 0, 0, 0, 0, 0, $2)
     ON CONFLICT (restaurant_id) DO NOTHING`,
    [restaurantId, ['pending_onboarding']]
  );
}

/** Dynamic partial update - only touches columns actually present in `fields`. */
async function updateProfile(id, fields, client = pool) {
  const columnMap = {
    name: 'name',
    phone: 'phone',
    cuisine: 'cuisine',
    image: 'image',
    deliveryTime: 'delivery_time',
    minOrder: 'min_order',
    isActive: 'is_active',
    description: 'description',
    supportedDietaryTags: 'supported_dietary_tags',
    latitude: 'latitude',
    longitude: 'longitude',
  };
  const addressColumnMap = { street: 'street', city: 'city', state: 'state', zipCode: 'zip_code' };

  const sets = [];
  const values = [];
  let i = 1;

  for (const [key, column] of Object.entries(columnMap)) {
    if (fields[key] !== undefined) {
      sets.push(`${column} = $${i++}`);
      values.push(fields[key]);
    }
  }
  if (fields.supported_dietary_tags !== undefined) {
    sets.push(`supported_dietary_tags = $${i++}`);
    values.push(fields.supported_dietary_tags);
  }
  if (fields.address) {
    for (const [key, column] of Object.entries(addressColumnMap)) {
      if (fields.address[key] !== undefined) {
        sets.push(`${column} = $${i++}`);
        values.push(fields.address[key]);
      }
    }
  }

  if (sets.length === 0) return findById(id, client);

  sets.push(`updated_at = now()`);
  values.push(id);

  await client.query(
    `UPDATE restaurants SET ${sets.join(', ')} WHERE id = $${i}`,
    values
  );
  return findById(id, client);
}

async function addMenuItem(restaurantId, item, client = pool) {
  const { rows } = await client.query(
    `INSERT INTO menu_items (restaurant_id, name, description, price, category, image, available)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, restaurant_id, name, description, price, category, image, available`,
    [
      restaurantId,
      item.name,
      item.description || null,
      item.price,
      item.category || null,
      item.image || null,
      item.available !== undefined ? item.available : true,
    ]
  );
  return rows[0];
}

async function updateMenuItem(restaurantId, menuItemId, fields, client = pool) {
  const columnMap = {
    name: 'name',
    description: 'description',
    price: 'price',
    category: 'category',
    image: 'image',
    available: 'available',
  };
  const sets = [];
  const values = [];
  let i = 1;
  for (const [key, column] of Object.entries(columnMap)) {
    if (fields[key] !== undefined) {
      sets.push(`${column} = $${i++}`);
      values.push(fields[key]);
    }
  }
  if (sets.length === 0) {
    const { rows } = await client.query(
      `SELECT id, restaurant_id, name, description, price, category, image, available
       FROM menu_items WHERE id = $1 AND restaurant_id = $2`,
      [menuItemId, restaurantId]
    );
    return rows[0] || null;
  }
  sets.push(`updated_at = now()`);
  values.push(menuItemId, restaurantId);

  const { rows } = await client.query(
    `UPDATE menu_items SET ${sets.join(', ')}
     WHERE id = $${i++} AND restaurant_id = $${i}
     RETURNING id, restaurant_id, name, description, price, category, image, available`,
    values
  );
  return rows[0] || null;
}

async function deleteMenuItem(restaurantId, menuItemId, client = pool) {
  const { rowCount } = await client.query(
    `DELETE FROM menu_items WHERE id = $1 AND restaurant_id = $2`,
    [menuItemId, restaurantId]
  );
  return rowCount > 0;
}

/** Batch lookup for order nutrition snapshots at checkout time. */
async function findMenuItemsByIds(ids, client = pool) {
  if (!ids?.length) return new Map();
  const { rows } = await client.query(
    `SELECT id, restaurant_id, name, price, available,
            calories, protein_g, carbs_g, fat_g, sugar_g, fiber_g, dietary_tags, allergens
     FROM menu_items WHERE id = ANY($1::uuid[])`,
    [ids]
  );
  return new Map(rows.map((row) => [row.id, row]));
}

module.exports = {
  findByEmail,
  findById,
  getMenu,
  findActive,
  findNearby,
  search,
  discover,
  findSelectEligible,
  create,
  createQualityProfile,
  updateProfile,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  findMenuItemsByIds,
};
