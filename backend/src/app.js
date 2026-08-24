const express = require('express');
const cors = require('cors');
const { pool, poolStats } = require('./config/db');
const env = require('./config/env');
const errorHandler = require('./middleware/errorHandler');
const { authRateLimit, apiRateLimit } = require('./middleware/rateLimit');

const authRoutes = require('./routes/auth.routes');
const restaurantsRoutes = require('./routes/restaurants.routes');
const restaurantAccountRoutes = require('./routes/restaurantAccount.routes');
const ordersRoutes = require('./routes/orders.routes');
const deliveryRoutes = require('./routes/delivery.routes');
const feedbackRoutes = require('./routes/feedback.routes');
const supportRoutes = require('./routes/support.routes');
const foodclubRoutes = require('./routes/foodclub.routes');
const adminRoutes = require('./routes/admin.routes');
const geoRoutes = require('./routes/geo.routes');

const app = express();

/** CORS - same allow-list behavior as the original app (env-configurable now). */
const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (env.CORS_ORIGINS.includes(origin) || /^http:\/\/10\.\d+\.\d+\.\d+:3000$/.test(origin)) {
      return callback(null, true);
    }
    console.log(`Blocked by CORS: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

/** Health check - also used as the Docker HEALTHCHECK and the CI smoke test. */
app.get('/health', async (req, res) => {
  let dbConnected = false;
  try {
    await pool.query('SELECT 1');
    dbConnected = true;
  } catch {
    dbConnected = false;
  }

  const healthData = {
    ok: dbConnected,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbConnected ? 'connected' : 'disconnected',
    pool: poolStats(),
  };
  res.status(dbConnected ? 200 : 503).json(healthData);
});

app.use('/api/auth', authRateLimit, authRoutes);
app.use('/api/restaurants', apiRateLimit, restaurantsRoutes);
app.use('/api/orders', apiRateLimit, ordersRoutes);
app.use('/api/delivery', apiRateLimit, deliveryRoutes);
app.use('/api/restaurant', apiRateLimit, restaurantAccountRoutes);
app.use('/api/feedback', apiRateLimit, feedbackRoutes);
app.use('/api/support', apiRateLimit, supportRoutes);
app.use('/api/v1', apiRateLimit, foodclubRoutes);
app.use('/api/v1/admin', apiRateLimit, adminRoutes);
app.use('/api/geo', apiRateLimit, geoRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'FoodClub API — curated food marketplace',
    version: '3.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      restaurant: '/api/restaurant',
      restaurants: '/api/restaurants',
      orders: '/api/orders',
    },
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    availableEndpoints: [
      'GET /health',
      'GET /api/restaurants',
      'POST /api/auth/user/login',
      'POST /api/auth/user/register',
      'POST /api/auth/restaurant/login',
      'POST /api/auth/restaurant/register',
      'GET /api/restaurant/menu',
      'POST /api/restaurant/menu',
    ],
  });
});

app.use(errorHandler);

module.exports = app;
