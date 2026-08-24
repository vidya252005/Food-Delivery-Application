const socketService = require('../../services/socketService');

/** Observer — pushes real-time updates over WebSocket. */
class SocketObserver {
  async handle(event) {
    if (event.type === 'order.status_changed') {
      socketService.emitOrderUpdate(event.payload.order);
    }
    if (event.type === 'driver.location') {
      socketService.emitDriverLocation(event.payload.orderId, event.payload.location);
    }
  }
}

module.exports = SocketObserver;
