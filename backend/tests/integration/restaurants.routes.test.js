const request = require('supertest');
const app = require('../../src/app');
const { resetDb, closeDb } = require('../setup/db');
const restaurantRepository = require('../../src/repositories/restaurantRepository');

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await closeDb();
});

async function seedRestaurant(overrides = {}) {
  return restaurantRepository.create({
    name: 'Bella Napoli',
    email: `bella-${Math.random()}@example.com`,
    passwordHash: 'irrelevant-for-these-tests',
    phone: '9876511002',
    cuisine: ['Italian'],
    address: { street: '9 Koramangala', city: 'Bengaluru', state: 'KA', zipCode: '560034' },
    ...overrides,
  });
}

describe('GET /api/restaurants', () => {
  test('lists only active restaurants, never leaks password_hash', async () => {
    const r1 = await seedRestaurant({ name: 'Active One' });
    await restaurantRepository.updateProfile(r1.id, { isActive: true });

    const res = await request(app).get('/api/restaurants');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((r) => r.name === 'Active One')).toBe(true);
    expect(res.body[0]).not.toHaveProperty('password_hash');
    expect(res.body[0]).not.toHaveProperty('passwordHash');
  });
});

describe('GET /api/restaurants/:id', () => {
  test('returns a restaurant with its menu embedded', async () => {
    const restaurant = await seedRestaurant();
    await restaurantRepository.addMenuItem(restaurant.id, { name: 'Margherita Pizza', price: 380 });

    const res = await request(app).get(`/api/restaurants/${restaurant.id}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Bella Napoli');
    expect(res.body.menu).toHaveLength(1);
    expect(res.body.menu[0].name).toBe('Margherita Pizza');
  });

  test('returns 404 for a well-formed but nonexistent id', async () => {
    const res = await request(app).get('/api/restaurants/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });

  test('returns 400 (not a raw 500) for a malformed id', async () => {
    const res = await request(app).get('/api/restaurants/not-a-uuid');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/restaurants/search/:query', () => {
  test('finds a restaurant by cuisine', async () => {
    await seedRestaurant({ name: 'Bella Napoli', cuisine: ['Italian'] });
    await seedRestaurant({ name: 'Spice Route', cuisine: ['Indian'] });

    const res = await request(app).get('/api/restaurants/search/Italian');
    expect(res.status).toBe(200);
    expect(res.body.map((r) => r.name)).toEqual(['Bella Napoli']);
  });

  test('finds a restaurant by name', async () => {
    await seedRestaurant({ name: 'Salad Days Koramangala' });
    await seedRestaurant({ name: 'Spice Route' });

    const res = await request(app).get('/api/restaurants/search/Salad');
    expect(res.status).toBe(200);
    expect(res.body.map((r) => r.name)).toEqual(['Salad Days Koramangala']);
  });

  test('finds a restaurant by menu item name without duplicate rows', async () => {
    const restaurant = await seedRestaurant({ name: 'Green Bowl Co' });
    await restaurantRepository.addMenuItem(restaurant.id, { name: 'Protein Power Bowl', price: 349 });
    await seedRestaurant({ name: 'Other Place' });

    const res = await request(app).get('/api/restaurants/search/Protein');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Green Bowl Co');
  });

  test('is registered before /:id so "search" is never treated as an id', async () => {
    const res = await request(app).get('/api/restaurants/search/nomatch');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});
