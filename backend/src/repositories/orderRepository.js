const { pool, withTransaction } = require('../config/db');

const ORDER_LIST_SELECT = `
  SELECT o.id, o.user_id, o.restaurant_id, o.total_amount, o.street, o.city, o.state, o.zip_code,
         o.status, o.payment_status, o.delivery_lat, o.delivery_lng, o.driver_lat, o.driver_lng,
         o.eta_minutes, o.estimated_delivery_at, o.created_at, o.updated_at,
         u.name AS user_name, u.email AS user_email,
         r.name AS restaurant_name, r.latitude AS restaurant_lat, r.longitude AS restaurant_lng
  FROM orders o
  JOIN users u ON u.id = o.user_id
  JOIN restaurants r ON r.id = o.restaurant_id
`;

const ORDER_ITEM_SELECT = `
  id, order_id, menu_item_id, name, price, quantity,
  calories, protein_g, carbs_g, fat_g, sugar_g, fiber_g, dietary_tags, allergens`;

async function getItemsForOrders(orderIds, client = pool) {
  if (orderIds.length === 0) return new Map();
  const { rows } = await client.query(
    `SELECT ${ORDER_ITEM_SELECT}
     FROM order_items WHERE order_id = ANY($1::uuid[])`,
    [orderIds]
  );
  const byOrder = new Map();
  for (const row of rows) {
    if (!byOrder.has(row.order_id)) byOrder.set(row.order_id, []);
    byOrder.get(row.order_id).push(row);
  }
  return byOrder;
}

async function findById(id, client = pool) {
  const { rows } = await client.query(`${ORDER_LIST_SELECT} WHERE o.id = $1`, [id]);
  if (!rows[0]) return null;
  const items = await getItemsForOrders([id], client);
  return { row: rows[0], items: items.get(id) || [] };
}

/** Hits idx_orders_user_id; results ordered using idx_orders_created_at. */
async function findByUser(userId, client = pool) {
  const { rows } = await client.query(
    `${ORDER_LIST_SELECT} WHERE o.user_id = $1 ORDER BY o.created_at DESC`,
    [userId]
  );
  const itemsByOrder = await getItemsForOrders(rows.map((r) => r.id), client);
  return rows.map((row) => ({ row, items: itemsByOrder.get(row.id) || [] }));
}

/** Hits the composite idx_orders_restaurant_status (or idx_orders_restaurant_id when status is omitted). */
async function findByRestaurant(restaurantId, { status } = {}, client = pool) {
  const params = [restaurantId];
  let where = 'o.restaurant_id = $1';
  if (status) {
    params.push(status);
    where += ` AND o.status = $${params.length}`;
  }
  const { rows } = await client.query(
    `${ORDER_LIST_SELECT} WHERE ${where} ORDER BY o.created_at DESC`,
    params
  );
  const itemsByOrder = await getItemsForOrders(rows.map((r) => r.id), client);
  return rows.map((row) => ({ row, items: itemsByOrder.get(row.id) || [] }));
}

/**
 * Creates an order and its line items as a single all-or-nothing unit:
 * either both the order row and every item row commit, or neither does.
 * Runs inside `withTransaction` so a failure on item 3 of 5 can't leave
 * an order with a wrong total and half its items.
 */
async function createWithItems({
  userId, restaurantId, items, totalAmount, deliveryAddress,
  deliveryLat, deliveryLng, etaMinutes, estimatedDeliveryAt,
  initialStatus = 'created',
}) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO orders (user_id, restaurant_id, total_amount, street, city, state, zip_code,
         delivery_lat, delivery_lng, eta_minutes, estimated_delivery_at, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id, user_id, restaurant_id, total_amount, street, city, state, zip_code,
         status, payment_status, delivery_lat, delivery_lng, driver_lat, driver_lng,
         eta_minutes, estimated_delivery_at, created_at, updated_at`,
      [
        userId,
        restaurantId,
        totalAmount,
        deliveryAddress?.street || null,
        deliveryAddress?.city || 'Bengaluru',
        deliveryAddress?.state || 'Karnataka',
        deliveryAddress?.zipCode || null,
        deliveryLat ?? deliveryAddress?.lat ?? null,
        deliveryLng ?? deliveryAddress?.lng ?? null,
        etaMinutes ?? null,
        estimatedDeliveryAt ?? null,
        initialStatus,
      ]
    );
    const order = rows[0];

    const itemRows = [];
    for (const item of items) {
      const { rows: itemResult } = await client.query(
        `INSERT INTO order_items (
           order_id, menu_item_id, name, price, quantity,
           calories, protein_g, carbs_g, fat_g, sugar_g, fiber_g, dietary_tags, allergens
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING ${ORDER_ITEM_SELECT}`,
        [
          order.id,
          item.menuItem || null,
          item.name,
          item.price,
          item.quantity || 1,
          item.calories ?? null,
          item.proteinG ?? item.protein_g ?? null,
          item.carbsG ?? item.carbs_g ?? null,
          item.fatG ?? item.fat_g ?? null,
          item.sugarG ?? item.sugar_g ?? null,
          item.fiberG ?? item.fiber_g ?? null,
          item.dietaryTags || item.dietary_tags || [],
          item.allergens || [],
        ]
      );
      itemRows.push(itemResult[0]);
    }

    return { row: order, items: itemRows };
  });
}

/**
 * Conditional status transition: the UPDATE only matches if the row's
 * *current* status is still one of `fromStatuses` at the moment the
 * statement runs. This is optimistic concurrency control - if two
 * requests race to transition the same order, the second one's WHERE
 * clause simply matches zero rows instead of silently clobbering the
 * first, which is the failure mode a plain `findByIdAndUpdate` allows.
 * Returns null on either "order doesn't exist" or "current status
 * wasn't a valid starting point"; the service layer tells those apart
 * with a separate existence check so it can return 404 vs 409.
 */
async function updateDriverLocation(id, lat, lng, client = pool) {
  const { rows } = await client.query(
    `UPDATE orders SET driver_lat = $1, driver_lng = $2, updated_at = now()
     WHERE id = $3
     RETURNING id, user_id, restaurant_id, driver_lat, driver_lng, status`,
    [lat, lng, id]
  );
  return rows[0] || null;
}

async function updateStatus(id, newStatus, fromStatuses, client = pool) {
  const { rows } = await client.query(
    `UPDATE orders SET status = $1, updated_at = now()
     WHERE id = $2 AND status = ANY($3::varchar[])
     RETURNING id, user_id, restaurant_id, total_amount, street, city, state, zip_code,
               status, payment_status, delivery_lat, delivery_lng, driver_lat, driver_lng,
               eta_minutes, estimated_delivery_at, created_at, updated_at`,
    [newStatus, id, fromStatuses]
  );
  return rows[0] || null;
}

/**
 * Restaurant dashboard stats, computed in the database with aggregates
 * instead of pulling every order row into Node and reducing over it in
 * JS. `FILTER (WHERE ...)` runs multiple conditional aggregates in one
 * pass over the (index-narrowed) row set rather than one query per
 * number.
 */
async function getRestaurantStats(restaurantId, client = pool) {
  const { rows } = await client.query(
    `SELECT
       COUNT(*)::int AS total_orders,
       COUNT(*) FILTER (WHERE status IN ('payment_pending','confirmed','restaurant_accepted','preparing','ready_for_pickup','out_for_delivery'))::int AS pending_orders,
       COALESCE(SUM(total_amount) FILTER (WHERE created_at::date = CURRENT_DATE), 0) AS today_revenue
     FROM orders
     WHERE restaurant_id = $1`,
    [restaurantId]
  );
  return rows[0];
}

module.exports = {
  findById,
  findByUser,
  findByRestaurant,
  createWithItems,
  updateStatus,
  updateDriverLocation,
  getRestaurantStats,
};
