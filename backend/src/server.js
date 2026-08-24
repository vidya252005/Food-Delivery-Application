const app = require('./app');
const { pool } = require('./config/db');
const env = require('./config/env');
const socketService = require('./services/socketService');

let server;

async function start() {
  try {
    await pool.query('SELECT 1');
    console.log('Connected to PostgreSQL');
    console.log(`Database: ${env.PG_DATABASE}`);

    server = app.listen(env.PORT, () => {
      console.log(`Server is running on port ${env.PORT}`);
      console.log(`API: http://localhost:${env.PORT}`);
      console.log(`Health: http://localhost:${env.PORT}/health`);
    });

    socketService.init(server);
    console.log('WebSocket server ready for real-time order updates');
  } catch (err) {
    console.error('PostgreSQL connection error:', err.message);
    process.exit(1);
  }
}

async function shutdown(signal) {
  console.log(`${signal} received: closing HTTP server`);
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await pool.end();
  console.log('PostgreSQL pool closed. Goodbye.');
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start();
