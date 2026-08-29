/** Full order lifecycle after POST /api/orders (ends at payment_pending). */
const ORDER_LIFECYCLE_PATH = Object.freeze([
  'confirmed',
  'restaurant_accepted',
  'preparing',
  'ready_for_pickup',
  'out_for_delivery',
  'delivered',
]);

/**
 * PATCH each status in ORDER_LIFECYCLE_PATH.
 * ready_for_pickup may auto-advance to out_for_delivery when a partner is assigned.
 */
async function advanceOrderLifecycle(request, app, orderId, restaurantToken) {
  for (const status of ORDER_LIFECYCLE_PATH) {
    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${restaurantToken}`)
      .send({ status });

    expect(res.status).toBe(200);

    if (status === 'ready_for_pickup' && res.body.status === 'out_for_delivery') {
      continue;
    }
    expect(res.body.status).toBe(status);
  }
}

module.exports = { ORDER_LIFECYCLE_PATH, advanceOrderLifecycle };
