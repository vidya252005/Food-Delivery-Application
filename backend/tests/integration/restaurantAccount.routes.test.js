const request = require('supertest');
const app = require('../../src/app');
const { pool } = require('../../src/config/db');
const { resetDb, closeDb } = require('../setup/db');

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await closeDb();
});

async function registerRestaurant(overrides = {}) {
  const email = overrides.email || `kitchen-${Date.now()}-${Math.random()}@example.com`;
  const res = await request(app).post('/api/auth/restaurant/register').send({
    name: 'Test Kitchen',
    email,
    password: 'secret123',
    phone: '9876500001',
    cuisine: ['Healthy Bowls'],
    address: {
      street: '80 Feet Road, Koramangala',
      city: 'Bengaluru',
      state: 'Karnataka',
      zipCode: '560034',
    },
    ...overrides,
  });
  expect(res.status).toBe(201);
  return { token: res.body.token, restaurantId: res.body.data.restaurant.id, email };
}

describe('restaurant self-service profile', () => {
  test('PUT /profile persists description and supported dietary tags', async () => {
    const { token } = await registerRestaurant();

    const res = await request(app)
      .put('/api/restaurant/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        description: 'Macro-counted bowls with full nutrition labels.',
        supportedDietaryTags: ['high_protein', 'vegetarian'],
      });

    expect(res.status).toBe(200);
    expect(res.body.description).toBe('Macro-counted bowls with full nutrition labels.');
    expect(res.body.supportedDietaryTags).toEqual(['high_protein', 'vegetarian']);
  });
});

describe('restaurant registration onboarding', () => {
  test('creates quality profile and geocodes address for nearby search', async () => {
    const { restaurantId } = await registerRestaurant();

    const { rows: [restaurant] } = await pool.query(
      'SELECT latitude, longitude FROM restaurants WHERE id = $1',
      [restaurantId]
    );
    expect(restaurant.latitude).not.toBeNull();
    expect(restaurant.longitude).not.toBeNull();

    const { rows: [quality] } = await pool.query(
      'SELECT overall_score, badges FROM quality_profiles WHERE restaurant_id = $1',
      [restaurantId]
    );
    expect(quality).toBeTruthy();
    expect(Number(quality.overall_score)).toBe(0);
    expect(quality.badges).toContain('pending_onboarding');

    const nearby = await request(app).get('/api/restaurants/nearby?lat=12.9352&lng=77.6245&radius=15');
    expect(nearby.status).toBe(200);
    expect(nearby.body.some((r) => r.id === restaurantId)).toBe(true);
  });
});
