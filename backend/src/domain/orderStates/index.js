const { OrderStatus } = require('../enums');
const AppError = require('../../utils/AppError');

/**
 * State Pattern — legal transitions per order state (LLD sections 14–15).
 * Each state exposes transition methods; invalid ops throw 409.
 */
const TRANSITIONS = Object.freeze({
  [OrderStatus.CREATED]: [OrderStatus.PAYMENT_PENDING, OrderStatus.CANCELLED],
  [OrderStatus.PAYMENT_PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.RESTAURANT_ACCEPTED, OrderStatus.CANCELLED],
  [OrderStatus.RESTAURANT_ACCEPTED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY_FOR_PICKUP, OrderStatus.CANCELLED],
  [OrderStatus.READY_FOR_PICKUP]: [OrderStatus.OUT_FOR_DELIVERY],
  [OrderStatus.OUT_FOR_DELIVERY]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
});

/** States from which customer/restaurant may cancel (LLD section 39). */
const CANCELLABLE = new Set([
  OrderStatus.CREATED,
  OrderStatus.PAYMENT_PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.RESTAURANT_ACCEPTED,
  OrderStatus.PREPARING,
]);

function canTransition(from, to) {
  return (TRANSITIONS[from] || []).includes(to);
}

function assertTransition(from, to) {
  if (!canTransition(from, to)) {
    throw new AppError(
      `Invalid order transition: "${from}" → "${to}". ` +
        `Allowed: ${(TRANSITIONS[from] || []).join(', ') || 'none (terminal)'}`,
      409
    );
  }
}

function canCancel(status) {
  return CANCELLABLE.has(status);
}

function isTerminal(status) {
  return status === OrderStatus.DELIVERED || status === OrderStatus.CANCELLED;
}

/** Human-readable labels for API/UI */
const LABELS = {
  [OrderStatus.CREATED]: 'Created',
  [OrderStatus.PAYMENT_PENDING]: 'Payment Pending',
  [OrderStatus.CONFIRMED]: 'Confirmed',
  [OrderStatus.RESTAURANT_ACCEPTED]: 'Restaurant Accepted',
  [OrderStatus.PREPARING]: 'Preparing',
  [OrderStatus.READY_FOR_PICKUP]: 'Ready for Pickup',
  [OrderStatus.OUT_FOR_DELIVERY]: 'Out for Delivery',
  [OrderStatus.DELIVERED]: 'Delivered',
  [OrderStatus.CANCELLED]: 'Cancelled',
};

module.exports = {
  TRANSITIONS,
  CANCELLABLE,
  canTransition,
  assertTransition,
  canCancel,
  isTerminal,
  LABELS,
};
