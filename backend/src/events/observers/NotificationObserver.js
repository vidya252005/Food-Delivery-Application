const notificationService = require('../../services/notificationService');
const { LABELS } = require('../../domain/orderStates');
const { OrderStatus } = require('../../domain/enums');

function formatConfirmationBody(order) {
  const restaurantName = order.restaurant?.name || 'your FoodClub partner';
  const summary = order.nutritionSummary;
  if (summary) {
    return `${restaurantName} confirmed your order — ~${summary.calories} kcal · ${summary.proteinGrams}g protein total`;
  }
  return `${restaurantName} confirmed your order and is getting started`;
}

function buildStatusNotification(order, newStatus) {
  const restaurantName = order.restaurant?.name || 'Restaurant';

  switch (newStatus) {
    case OrderStatus.CONFIRMED:
      return {
        title: 'Order Confirmed',
        body: formatConfirmationBody(order),
      };
    case OrderStatus.RESTAURANT_ACCEPTED:
      return {
        title: 'Restaurant Accepted',
        body: `${restaurantName} is preparing your food`,
      };
    case OrderStatus.OUT_FOR_DELIVERY:
      return {
        title: 'On the way!',
        body: 'Your delivery partner is heading to you',
      };
    case OrderStatus.DELIVERED:
      return {
        title: 'Delivered',
        body: 'Your order has been delivered. Enjoy your meal!',
      };
    case OrderStatus.CANCELLED:
      return {
        title: 'Order Cancelled',
        body: 'Your order was cancelled',
      };
    default:
      return {
        title: 'Order Update',
        body: `Your order is now: ${LABELS[newStatus] || newStatus}`,
      };
  }
}

/** Observer — sends in-app notifications on order status change (LLD section 28). */
class NotificationObserver {
  async handle(event) {
    if (event.type !== 'order.status_changed') return;

    const { order, newStatus } = event.payload;
    const userId = order.user?.id || order.user;
    if (!userId) return;

    const { title, body } = buildStatusNotification(order, newStatus);
    await notificationService.create({
      userId,
      orderId: order.id,
      title,
      body,
    });
  }
}

module.exports = NotificationObserver;
