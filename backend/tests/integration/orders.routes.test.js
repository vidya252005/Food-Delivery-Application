const request = require('supertest');
const app = require('../../src/app');
const { resetDb, closeDb } = require('../setup/db');
const userRepository = require('../../src/repositories/userRepository');
const restaurantRepository = require('../../src/repositories/restaurantRepository');
const { bearerToken } = require('../helpers/auth');
const { advanceOrderLifecycle } = require('../helpers/lifecycle');

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await closeDb();
});

async function seedUserAndRestaurant() {
  const user = await userRepository.create({
    name: 'Asha Rao',
    email: `asha-${Math.random()}@example.com`,
    passwordHash: 'irrelevant',
    phone: '9876500001',
  });
  const restaurant = await restaurantRepository.create({
    name: 'Bella Napoli',
    email: `bella-${Math.random()}@example.com`,
    passwordHash: 'irrelevant',
    phone: '9876511002',
    cuisine: ['Italian'],
    address: {},
  });
  const menuItem = await restaurantRepository.addMenuItem(restaurant.id, {
    name: 'Margherita Pizza',
    price: 380,
  });
  return {
    user,
    restaurant,
    menuItem,
    userToken: bearerToken(user.id, 'user'),
    restaurantToken: bearerToken(restaurant.id, 'restaurant'),
  };
}

describe('POST /api/orders', () => {
  test('creates an order with its items atomically and returns the populated shape', async () => {
    const { user, restaurant, menuItem, userToken } = await seedUserAndRestaurant();

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        user: user.id,
        restaurant: restaurant.id,
        items: [{ menuItem: menuItem.id, name: 'Margherita Pizza', price: 380, quantity: 2 }],
        totalAmount: 760,
        deliveryAddress: { street: '1 Test St', city: 'Bengaluru', state: 'KA', zipCode: '560001' },
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('payment_pending');
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].quantity).toBe(2);
    expect(res.body.user.name).toBe('Asha Rao');
    expect(res.body.restaurant.name).toBe('Bella Napoli');
  });

  test('401s without a user token', async () => {
    const { user, restaurant, menuItem } = await seedUserAndRestaurant();
    const res = await request(app)
      .post('/api/orders')
      .send({
        user: user.id,
        restaurant: restaurant.id,
        items: [{ menuItem: menuItem.id, name: 'Margherita Pizza', price: 380, quantity: 1 }],
        totalAmount: 380,
      });
    expect(res.status).toBe(401);
  });

  test('403s when placing an order for another user', async () => {
    const { user, restaurant, menuItem, userToken } = await seedUserAndRestaurant();
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        user: '00000000-0000-0000-0000-000000000000',
        restaurant: restaurant.id,
        items: [{ menuItem: menuItem.id, name: 'Margherita Pizza', price: 380, quantity: 1 }],
        totalAmount: 380,
      });
    expect(res.status).toBe(403);
  });

  test('400s on a missing items array instead of a raw DB error', async () => {
    const { user, restaurant, userToken } = await seedUserAndRestaurant();
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ user: user.id, restaurant: restaurant.id, totalAmount: 100 });
    expect(res.status).toBe(400);
  });

  test('400s when the referenced user does not exist (FK violation surfaced cleanly)', async () => {
    const { restaurant, menuItem, userToken } = await seedUserAndRestaurant();
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        user: '00000000-0000-0000-0000-000000000000',
        restaurant: restaurant.id,
        items: [{ menuItem: menuItem.id, name: 'X', price: 10, quantity: 1 }],
        totalAmount: 10,
      });
    expect(res.status).toBe(403);
  });

  test('charges DB menu price when client submits a tampered price', async () => {
    const { user, restaurant, menuItem, userToken } = await seedUserAndRestaurant();

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        user: user.id,
        restaurant: restaurant.id,
        items: [{
          menuItem: menuItem.id,
          name: 'Margherita Pizza',
          price: 1,
          quantity: 1,
        }],
        totalAmount: 1,
      });

    expect(res.status).toBe(201);
    expect(res.body.items[0].price).toBe(380);
    // subtotal 380 + 5% tax 19 + ₹40 delivery
    expect(Number(res.body.totalAmount)).toBe(439);
  });

  test('400s when a menu item belongs to another restaurant', async () => {
    const a = await seedUserAndRestaurant();
    const b = await seedUserAndRestaurant();

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${a.userToken}`)
      .send({
        user: a.user.id,
        restaurant: a.restaurant.id,
        items: [{ menuItem: b.menuItem.id, name: 'Margherita Pizza', price: 380, quantity: 1 }],
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/does not belong/i);
  });

  test('400s when cart line omits menuItem id', async () => {
    const { user, restaurant, userToken } = await seedUserAndRestaurant();

    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        user: user.id,
        restaurant: restaurant.id,
        items: [{ name: 'Fake item', price: 1, quantity: 1 }],
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/menu item/i);
  });
});

describe('order status workflow over HTTP', () => {
  async function createOrder() {
    const { user, restaurant, menuItem, userToken, restaurantToken } = await seedUserAndRestaurant();
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        user: user.id,
        restaurant: restaurant.id,
        items: [{ menuItem: menuItem.id, name: 'Margherita Pizza', price: 380, quantity: 1 }],
        totalAmount: 380,
      });
    return { orderId: res.body.id, user, restaurant, userToken, restaurantToken };
  }

  test('walks the full happy-path lifecycle through payment_pending → delivered', async () => {
    const { orderId, restaurantToken } = await createOrder();
    await advanceOrderLifecycle(request, app, orderId, restaurantToken);
  });

  test('409s when skipping restaurant_accepted (confirmed → preparing)', async () => {
    const { orderId, restaurantToken } = await createOrder();

    await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${restaurantToken}`)
      .send({ status: 'confirmed' });

    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${restaurantToken}`)
      .send({ status: 'preparing' });

    expect(res.status).toBe(409);
  });

  test('rejects skipping straight from payment_pending to delivered with 409', async () => {
    const { orderId, restaurantToken } = await createOrder();
    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${restaurantToken}`)
      .send({ status: 'delivered' });
    expect(res.status).toBe(409);
  });

  test('403s status updates from a restaurant that does not own the order', async () => {
    const { orderId } = await createOrder();
    const other = await seedUserAndRestaurant();
    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${other.restaurantToken}`)
      .send({ status: 'confirmed' });
    expect(res.status).toBe(403);
  });

  test('401s unauthenticated status updates', async () => {
    const { orderId } = await createOrder();
    const res = await request(app).patch(`/api/orders/${orderId}/status`).send({ status: 'confirmed' });
    expect(res.status).toBe(401);
  });

  test('rejects any transition once an order is delivered', async () => {
    const { orderId, restaurantToken } = await createOrder();
    await advanceOrderLifecycle(request, app, orderId, restaurantToken);
    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${restaurantToken}`)
      .send({ status: 'cancelled' });
    expect(res.status).toBe(409);
  });

  test('404s for a status update on a nonexistent order', async () => {
    const { restaurantToken } = await createOrder();
    const res = await request(app)
      .patch('/api/orders/00000000-0000-0000-0000-000000000000/status')
      .set('Authorization', `Bearer ${restaurantToken}`)
      .send({ status: 'confirmed' });
    expect(res.status).toBe(404);
  });

  test('two concurrent requests racing to transition the same order: exactly one wins', async () => {
    const { orderId, restaurantToken } = await createOrder();

    const [a, b] = await Promise.all([
      request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${restaurantToken}`)
        .send({ status: 'confirmed' }),
      request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${restaurantToken}`)
        .send({ status: 'confirmed' }),
    ]);

    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([200, 409]);
  });
});

describe('GET /api/orders/user/:userId and /api/orders/restaurant/:restaurantId', () => {
  test('each lists only its own orders when authenticated, newest first', async () => {
    const { user, restaurant, menuItem, userToken, restaurantToken } = await seedUserAndRestaurant();
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          user: user.id,
          restaurant: restaurant.id,
          items: [{ menuItem: menuItem.id, name: 'Margherita Pizza', price: 380, quantity: 1 }],
          totalAmount: 380,
        });
    }

    const byUser = await request(app)
      .get(`/api/orders/user/${user.id}`)
      .set('Authorization', `Bearer ${userToken}`);
    const byRestaurant = await request(app)
      .get(`/api/orders/restaurant/${restaurant.id}`)
      .set('Authorization', `Bearer ${restaurantToken}`);

    expect(byUser.body).toHaveLength(3);
    expect(byRestaurant.body).toHaveLength(3);
  });

  test('403s when a user tries to read another user\'s orders', async () => {
    const a = await seedUserAndRestaurant();
    const b = await seedUserAndRestaurant();
    const res = await request(app)
      .get(`/api/orders/user/${a.user.id}`)
      .set('Authorization', `Bearer ${b.userToken}`);
    expect(res.status).toBe(403);
  });

  test('401s unauthenticated order history', async () => {
    const { user } = await seedUserAndRestaurant();
    const res = await request(app).get(`/api/orders/user/${user.id}`);
    expect(res.status).toBe(401);
  });
});
