const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const { resetDb, closeDb } = require('../setup/db');
const userRepository = require('../../src/repositories/userRepository');
const restaurantRepository = require('../../src/repositories/restaurantRepository');
const deliveryPartnerRepository = require('../../src/repositories/deliveryPartnerRepository');
const deliveryRepository = require('../../src/repositories/deliveryRepository');
const { bearerToken } = require('../helpers/auth');
const { ORDER_LIFECYCLE_PATH } = require('../helpers/lifecycle');

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await closeDb();
});

async function seedOrderWithAssignedDelivery() {
  const passwordHash = await bcrypt.hash('password123', 12);
  const user = await userRepository.create({
    name: 'Asha Rao',
    email: `asha-${Math.random()}@example.com`,
    passwordHash,
    phone: '9876500001',
  });
  const restaurant = await restaurantRepository.create({
    name: 'Bella Napoli',
    email: `bella-${Math.random()}@example.com`,
    passwordHash,
    phone: '9876511002',
    cuisine: ['Italian'],
    address: {},
  });
  const menuItem = await restaurantRepository.addMenuItem(restaurant.id, {
    name: 'Margherita Pizza',
    price: 380,
  });
  const partner = await deliveryPartnerRepository.create({
    name: 'Ravi Kumar',
    email: `ravi-${Math.random()}@example.com`,
    passwordHash,
    phone: '9876500100',
    lat: 12.935,
    lng: 77.624,
  });
  const otherPartner = await deliveryPartnerRepository.create({
    name: 'Meera Nair',
    email: `meera-${Math.random()}@example.com`,
    passwordHash,
    phone: '9876500101',
    lat: 12.978,
    lng: 77.641,
  });

  const userToken = bearerToken(user.id, 'user');
  const restaurantToken = bearerToken(restaurant.id, 'restaurant');
  const partnerToken = bearerToken(partner.id, 'delivery_partner');
  const otherPartnerToken = bearerToken(otherPartner.id, 'delivery_partner');

  const orderRes = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${userToken}`)
    .send({
      user: user.id,
      restaurant: restaurant.id,
      items: [{ menuItem: menuItem.id, name: 'Margherita Pizza', price: 380, quantity: 1 }],
      totalAmount: 380,
    });

  const orderId = orderRes.body.id;
  for (const status of ORDER_LIFECYCLE_PATH.slice(0, 4)) {
    await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${restaurantToken}`)
      .send({ status });
  }

  const delivery = await deliveryRepository.create({
    orderId,
    pickupLat: 12.935,
    pickupLng: 77.624,
    dropLat: 12.97,
    dropLng: 77.59,
  });
  await deliveryRepository.assignPartner(delivery.id, partner.id);

  return { orderId, partner, otherPartner, partnerToken, otherPartnerToken };
}

describe('POST /api/delivery/pickup and /complete', () => {
  test('401s without a delivery partner token', async () => {
    const { orderId } = await seedOrderWithAssignedDelivery();
    const res = await request(app).post('/api/delivery/pickup').send({ orderId });
    expect(res.status).toBe(401);
  });

  test('403s when a partner tries to act on another partner\'s delivery', async () => {
    const { orderId, otherPartnerToken } = await seedOrderWithAssignedDelivery();
    const res = await request(app)
      .post('/api/delivery/pickup')
      .set('Authorization', `Bearer ${otherPartnerToken}`)
      .send({ orderId, partnerId: '00000000-0000-0000-0000-000000000000' });
    expect(res.status).toBe(403);
  });

  test('403s when body.partnerId does not match the authenticated partner', async () => {
    const { orderId, partnerToken, otherPartner } = await seedOrderWithAssignedDelivery();
    const res = await request(app)
      .post('/api/delivery/complete')
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({ orderId, partnerId: otherPartner.id });
    expect(res.status).toBe(403);
  });

  test('allows the assigned partner to pick up and complete', async () => {
    const { orderId, partnerToken } = await seedOrderWithAssignedDelivery();

    const pickup = await request(app)
      .post('/api/delivery/pickup')
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({ orderId });

    expect(pickup.status).toBe(200);
    expect(pickup.body.status).toBe('out_for_delivery');

    const complete = await request(app)
      .post('/api/delivery/complete')
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({ orderId });

    expect(complete.status).toBe(200);
    expect(complete.body.status).toBe('delivered');
  });
});

describe('PATCH /api/delivery/partners/*', () => {
  test('401s unauthenticated partner mutations', async () => {
    const res = await request(app)
      .patch('/api/delivery/partners/availability')
      .send({ status: 'offline' });
    expect(res.status).toBe(401);
  });

  test('updates availability for the authenticated partner only', async () => {
    const passwordHash = await bcrypt.hash('password123', 12);
    const partner = await deliveryPartnerRepository.create({
      name: 'Ravi Kumar',
      email: `ravi-${Math.random()}@example.com`,
      passwordHash,
      phone: '9876500100',
      lat: 12.935,
      lng: 77.624,
    });
    const partnerToken = bearerToken(partner.id, 'delivery_partner');

    const res = await request(app)
      .patch('/api/delivery/partners/availability')
      .set('Authorization', `Bearer ${partnerToken}`)
      .send({ status: 'offline' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('offline');
  });
});

describe('POST /api/auth/delivery/login', () => {
  test('returns a delivery_partner token for valid credentials', async () => {
    const passwordHash = await bcrypt.hash('password123', 12);
    const email = `ravi-${Math.random()}@example.com`;
    await deliveryPartnerRepository.create({
      name: 'Ravi Kumar',
      email,
      passwordHash,
      phone: '9876500100',
      lat: 12.935,
      lng: 77.624,
    });

    const res = await request(app)
      .post('/api/auth/delivery/login')
      .send({ email, password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('delivery_partner');
    expect(res.body.token).toBeTruthy();
  });
});
