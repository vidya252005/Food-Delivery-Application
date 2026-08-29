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

describe('POST /api/auth/user/register', () => {
  test('creates a user and returns a token in the original response envelope', async () => {
    const res = await request(app).post('/api/auth/user/register').send({
      name: 'Asha Rao',
      email: 'asha@example.com',
      password: 'secret123',
      phone: '9876500001',
    });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(typeof res.body.token).toBe('string');
    expect(res.body.data).toEqual({
      role: 'user',
      user: { id: expect.any(String), name: 'Asha Rao', email: 'asha@example.com', role: 'user' },
    });
  });

  test('rejects a duplicate email with 400', async () => {
    await request(app).post('/api/auth/user/register').send({
      name: 'Asha Rao',
      email: 'asha@example.com',
      password: 'secret123',
    });
    const res = await request(app).post('/api/auth/user/register').send({
      name: 'Someone Else',
      email: 'asha@example.com',
      password: 'different123',
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/user/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/user/register').send({
      name: 'Asha Rao',
      email: 'asha@example.com',
      password: 'secret123',
    });
  });

  test('logs in with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/user/login')
      .send({ email: 'asha@example.com', password: 'secret123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  test('rejects wrong password with 401 and no token', async () => {
    const res = await request(app)
      .post('/api/auth/user/login')
      .send({ email: 'asha@example.com', password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(res.body.token).toBeUndefined();
  });

  test('rejects an unknown email with 401 (not a 500 from a null user)', async () => {
    const res = await request(app)
      .post('/api/auth/user/login')
      .send({ email: 'nobody@example.com', password: 'whatever' });
    expect(res.status).toBe(401);
  });
});

describe('restaurant auth', () => {
  test('register then login works end to end', async () => {
    const registerRes = await request(app).post('/api/auth/restaurant/register').send({
      name: 'Bella Napoli',
      email: 'bella@example.com',
      password: 'secret123',
      cuisine: ['Italian'],
      address: { street: '9 Koramangala', city: 'Bengaluru', state: 'KA', zipCode: '560034' },
    });
    expect(registerRes.status).toBe(201);
    expect(registerRes.body.data.role).toBe('restaurant');

    const loginRes = await request(app)
      .post('/api/auth/restaurant/login')
      .send({ email: 'bella@example.com', password: 'secret123' });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.restaurant.name).toBe('Bella Napoli');
  });

  test('registration provisions geocoordinates and a quality profile row', async () => {
    const registerRes = await request(app).post('/api/auth/restaurant/register').send({
      name: 'Fresh Start Cafe',
      email: 'fresh@example.com',
      password: 'secret123',
      cuisine: ['Salads'],
      address: { street: '100 Feet Road, Indiranagar', city: 'Bengaluru', state: 'KA', zipCode: '560038' },
    });
    expect(registerRes.status).toBe(201);
    const restaurantId = registerRes.body.data.restaurant.id;

    const { rows: [row] } = await pool.query(
      `SELECT r.latitude, r.longitude, qp.overall_score
       FROM restaurants r
       LEFT JOIN quality_profiles qp ON qp.restaurant_id = r.id
       WHERE r.id = $1`,
      [restaurantId]
    );
    expect(row.latitude).not.toBeNull();
    expect(row.longitude).not.toBeNull();
    expect(Number(row.overall_score)).toBe(0);
  });
});
