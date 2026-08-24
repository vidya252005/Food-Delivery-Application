let io = null;

/** Active driver simulations keyed by order id. */
const driverSimulations = new Map();

function init(httpServer) {
  const { Server } = require('socket.io');
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    socket.on('join:order', (orderId) => {
      if (orderId) socket.join(`order:${orderId}`);
    });
    socket.on('join:user', (userId) => {
      if (userId) socket.join(`user:${userId}`);
    });
    socket.on('join:restaurant', (restaurantId) => {
      if (restaurantId) socket.join(`restaurant:${restaurantId}`);
    });
  });

  return io;
}

function getIO() {
  return io;
}

function emitOrderUpdate(order) {
  if (!io || !order) return;
  const payload = { order, timestamp: new Date().toISOString() };
  io.to(`order:${order.id}`).emit('order:update', payload);
  if (order.user?.id || typeof order.user === 'string') {
    const uid = order.user?.id || order.user;
    io.to(`user:${uid}`).emit('order:update', payload);
  }
  if (order.restaurant?.id || typeof order.restaurant === 'string') {
    const rid = order.restaurant?.id || order.restaurant;
    io.to(`restaurant:${rid}`).emit('order:update', payload);
  }
}

function emitDriverLocation(orderId, location) {
  if (!io) return;
  io.to(`order:${orderId}`).emit('driver:location', {
    orderId,
    ...location,
    timestamp: new Date().toISOString(),
  });
}

function startDriverSimulation(orderId, from, to, onComplete) {
  stopDriverSimulation(orderId);
  let step = 0;
  const totalSteps = 24;
  const interval = setInterval(() => {
    step += 1;
    const progress = step / totalSteps;
    const { lat, lng } = require('./geoService').interpolateRoute(
      from.lat, from.lng, to.lat, to.lng, progress
    );
    emitDriverLocation(orderId, { lat, lng, progress });

    if (step >= totalSteps) {
      stopDriverSimulation(orderId);
      if (onComplete) onComplete();
    }
  }, 4000);
  driverSimulations.set(orderId, interval);
}

function stopDriverSimulation(orderId) {
  const existing = driverSimulations.get(orderId);
  if (existing) {
    clearInterval(existing);
    driverSimulations.delete(orderId);
  }
}

module.exports = {
  init,
  getIO,
  emitOrderUpdate,
  emitDriverLocation,
  startDriverSimulation,
  stopDriverSimulation,
};
