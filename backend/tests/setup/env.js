// Jest setupFiles run before any test module (and before src/config/env.js)
// is loaded, so setting these here means the app under test talks to a
// dedicated test database instead of dev - no risk of a test run
// truncating real dev data.
process.env.NODE_ENV = 'test';
process.env.PG_DATABASE = process.env.PG_TEST_DATABASE || 'food_delivery_test';
process.env.JWT_SECRET = 'test-secret';
