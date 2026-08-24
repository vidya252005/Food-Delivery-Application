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

/** Observer — sends in-app notifications on order status change (LLD section 28). */
class NotificationObserver {
  async handle(event) {
    if (event.type !== 'order.status_changed') return;

    const { order, previousStatus, newStatus } = event.payload;
    const userId = order.user?.id || order.user;
    if (!userId) return;

    if (newStatus === OrderStatus.CONFIRMED) {
      await notificationService.create({
        userId,
        orderId: order.id,
        title: 'Order Confirmed',
        body: formatConfirmationBody(order),
      });
      return;
    }

    await notificationService.create({
      userId,
      orderId: order.id,
      title: 'Order Update',
      body: `Your order is now: ${LABELS[newStatus] || newStatus}`,
    });

    if (newStatus === 'restaurant_accepted') {
      await notificationService.create({
        userId,
        orderId: order.id,
        title: 'Restaurant Accepted',
        body: `${order.restaurant?.name || 'Restaurant'} is preparing your food`,
      });
    }
    if (newStatus === 'out_for_delivery') {
      await notificationService.create({
        userId,
        orderId: order.id,
        title: 'On the way!',
        body: 'Your delivery partner is heading to you',
      });
    }
    if (previousStatus) {
      /* logged for analytics hook */
    }
  }
}

module.exports = NotificationObserver;
