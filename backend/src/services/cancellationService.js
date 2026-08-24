const orderRepository = require('../repositories/orderRepository');
const paymentRepository = require('../repositories/paymentRepository');
const { assertTransition, canCancel } = require('../domain/orderStates');
const { OrderStatus, PaymentStatus } = require('../domain/enums');
const { eventPublisher } = require('../events/EventPublisher');
const AppError = require('../utils/AppError');

/** CancellationService — validates rules + triggers refund (LLD section 52). */
async function cancel(orderId, { reason } = {}) {
  const existing = await orderRepository.findById(orderId);
  if (!existing) throw new AppError('Order not found', 404);

  const current = existing.row.status;
  if (!canCancel(current)) {
    throw new AppError(`Order in "${current}" cannot be cancelled`, 409);
  }

  assertTransition(current, OrderStatus.CANCELLED);

  const updated = await orderRepository.updateStatus(orderId, OrderStatus.CANCELLED, [current]);
  if (!updated) throw new AppError('Order status changed concurrently — retry', 409);

  const payment = await paymentRepository.findByOrderId(orderId);
  if (payment?.status === PaymentStatus.SUCCESS) {
    await paymentRepository.updateStatus(payment.id, PaymentStatus.REFUNDED);
  }

  const full = await orderRepository.findById(orderId);
  const { mapOrder } = require('../utils/mappers');
  const order = mapOrder(full.row, full.items);

  await eventPublisher.publish({
    type: 'order.status_changed',
    payload: { order, previousStatus: current, newStatus: OrderStatus.CANCELLED, reason },
  });

  return order;
}

module.exports = { cancel };
