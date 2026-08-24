require('dotenv').config({ quiet: true });

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5001', 10),

  // Individual PG* vars are preferred over a single DATABASE_URL so each
  // piece (pool size, timeouts) can be tuned independently per environment.
  PG_HOST: process.env.PG_HOST || 'localhost',
  PG_PORT: parseInt(process.env.PG_PORT || '5432', 10),
  PG_DATABASE: process.env.PG_DATABASE || 'food_delivery',
  PG_USER: process.env.PG_USER || 'food_delivery_app',
  PG_PASSWORD: process.env.PG_PASSWORD || 'devpassword',

  // Connection pool tuning - see src/config/db.js for how these are used.
  PG_POOL_MAX: parseInt(process.env.PG_POOL_MAX || '20', 10),
  PG_POOL_MIN: parseInt(process.env.PG_POOL_MIN || '2', 10),
  PG_IDLE_TIMEOUT_MS: parseInt(process.env.PG_IDLE_TIMEOUT_MS || '30000', 10),
  PG_CONN_TIMEOUT_MS: parseInt(process.env.PG_CONN_TIMEOUT_MS || '5000', 10),

  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-me',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  CORS_ORIGINS: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
};

if (env.NODE_ENV === 'production' && env.JWT_SECRET === 'dev-secret-change-me') {
  // Fail loudly rather than silently signing tokens with a public default.
  throw new Error('JWT_SECRET must be set in production');
}

module.exports = env;
