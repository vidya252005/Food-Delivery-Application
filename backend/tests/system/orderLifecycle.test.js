const request = require('supertest');
const app = require('../../src/app');
const { resetDb, closeDb } = require('../setup/db');

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await closeDb();
});

/**
 * Mirrors an actual usage session end to end: a restaurant owner sets up
 * their account and menu, a customer signs up and orders, the order
 * moves through its full lifecycle, the customer leaves feedback, and
 * the restaurant's dashboard stats reflect all of it. If any layer
 * (auth -> menu -> ordering -> state machine -> feedback -> stats)
 * were wired together wrong, this is the test that would catch it.
 */
test('full order lifecycle: restaurant onboarding through delivery and feedback', async () => {
  // 1. Restaurant registers and logs in.
  const restaurantRegister = await request(app).post('/api/auth/restaurant/register').send({
    name: 'Spice Route',
    email: 'spiceroute@example.com',
    password: 'secret123',
    cuisine: ['Indian'],
    address: { street: '1 Indiranagar', city: 'Bengaluru', state: 'KA', zipCode: '560038' },
  });
  expect(restaurantRegister.status).toBe(201);
  const restaurantToken = restaurantRegister.body.token;
  const restaurantId = restaurantRegister.body.data.restaurant.id;

  // 2. Restaurant adds a menu item using its own authenticated endpoint.
  const menuRes = await request(app)
    .post('/api/restaurant/menu')
    .set('Authorization', `Bearer ${restaurantToken}`)
    .send({ name: 'Butter Chicken', price: 320, category: 'Main Course' });
  expect(menuRes.status).toBe(201);
  const menuItemId = menuRes.body.id;

  // 3. Menu management without a token is rejected.
  const unauthMenuRes = await request(app)
    .post('/api/restaurant/menu')
    .send({ name: 'Should Not Work', price: 1 });
  expect(unauthMenuRes.status).toBe(401);

  // 4. Customer registers.
  const userRegister = await request(app).post('/api/auth/user/register').send({
    name: 'Rohit Sharma',
    email: 'rohit@example.com',
    password: 'secret123',
  });
  const userId = userRegister.body.data.user.id;
  const userToken = userRegister.body.token;

  // 5. Customer browses the restaurant and its menu.
  const restaurantDetail = await request(app).get(`/api/restaurants/${restaurantId}`);
  expect(restaurantDetail.body.menu.map((m) => m.name)).toContain('Butter Chicken');

  // 6. Customer places an order.
  const orderRes = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${userToken}`)
    .send({
      user: userId,
      restaurant: restaurantId,
      items: [{ menuItem: menuItemId, name: 'Butter Chicken', price: 320, quantity: 2 }],
      totalAmount: 640,
      deliveryAddress: { street: '45 Park Street', city: 'Bengaluru', state: 'KA', zipCode: '560001' },
    });
  expect(orderRes.status).toBe(201);
  const orderId = orderRes.body.id;

  // 7. Restaurant sees the order in its own queue.
  const restaurantOrders = await request(app)
    .get('/api/restaurant/orders')
    .set('Authorization', `Bearer ${restaurantToken}`);
  expect(restaurantOrders.body.map((o) => o.id)).toContain(orderId);

  // 8. Order moves through its full lifecycle.
  for (const status of [
    'confirmed',
    'restaurant_accepted',
    'preparing',
    'ready_for_pickup',
    'out_for_delivery',
    'delivered',
  ]) {
    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${restaurantToken}`)
      .send({ status });
    expect(res.status).toBe(200);
  }

  // 9. Customer leaves feedback.
  const feedbackRes = await request(app).post('/api/feedback').send({
    orderId,
    userId,
    restaurantId,
    rating: 5,
    foodQuality: 5,
    deliverySpeed: 4,
    comment: 'Excellent butter chicken!',
  });
  expect(feedbackRes.status).toBe(201);

  // 10. A second feedback submission for the same order is rejected.
  const dupeFeedback = await request(app).post('/api/feedback').send({
    orderId,
    userId,
    restaurantId,
    rating: 3,
  });
  expect(dupeFeedback.status).toBe(400);

  // 11. Restaurant dashboard stats reflect the completed order.
  const statsRes = await request(app)
    .get('/api/restaurant/stats')
    .set('Authorization', `Bearer ${restaurantToken}`);
  expect(statsRes.body.totalOrders).toBe(1);
  expect(statsRes.body.totalMenuItems).toBe(1);
});

test('support ticket can be filed without authentication', async () => {
  const res = await request(app).post('/api/support').send({
    name: 'Meera Iyer',
    email: 'meera@example.com',
    issue: 'My order arrived cold.',
  });
  expect(res.status).toBe(201);

  const list = await request(app).get('/api/support');
  expect(list.body.some((t) => t.email === 'meera@example.com')).toBe(true);
});
