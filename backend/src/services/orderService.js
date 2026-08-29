const orderRepository = require('../repositories/orderRepository');
const restaurantRepository = require('../repositories/restaurantRepository');
const { mapOrder } = require('../utils/mappers');
const AppError = require('../utils/AppError');
const geoService = require('./geoService');
const pricingService = require('./pricingService');
const paymentService = require('./paymentService');
const deliveryService = require('./deliveryService');
const cancellationService = require('./cancellationService');
const membershipService = require('./membershipService');
const { eventPublisher } = require('../events/EventPublisher');
const NotificationObserver = require('../events/observers/NotificationObserver');
const SocketObserver = require('../events/observers/SocketObserver');
const socketService = require('./socketService');
const { OrderStatus } = require('../domain/enums');
const { assertTransition, TRANSITIONS, LABELS } = require('../domain/orderStates');
const { pickCartItems } = require('../utils/sanitize');

// Wire observers once (LLD section 28–29)
eventPublisher.subscribe(new NotificationObserver());
eventPublisher.subscribe(new SocketObserver());

function toOrderDTO(record) {
  if (!record) return null;
  return mapOrder(record.row, record.items);
}

async function getById(id) {
  return toOrderDTO(await orderRepository.findById(id));
}

async function listForUser(userId) {
  const records = await orderRepository.findByUser(userId);
  return records.map(toOrderDTO);
}

async function listForRestaurant(restaurantId, status) {
  const records = await orderRepository.findByRestaurant(restaurantId, { status });
  return records.map(toOrderDTO);
}

function normalizeQuantity(raw) {
  const quantity = Math.floor(Number(raw ?? 1));
  if (!Number.isFinite(quantity) || quantity < 1) {
    throw new AppError('quantity must be at least 1', 400);
  }
  if (quantity > 99) {
    throw new AppError('quantity cannot exceed 99 per item', 400);
  }
  return quantity;
}

/** Resolve cart lines from menu_items — prices and names come from DB, not the client. */
function resolveCartItems(items, restaurantId, menuById) {
  if (!items.every((item) => item.menuItem)) {
    throw new AppError('Each cart item must reference a menu item', 400);
  }

  return items.map((item) => {
    const menu = menuById.get(item.menuItem);
    if (!menu) throw new AppError(`Menu item not found: ${item.menuItem}`, 404);
    if (menu.restaurant_id !== restaurantId) {
      throw new AppError('Menu item does not belong to this restaurant', 400);
    }
    if (menu.available === false) {
      throw new AppError(`"${menu.name}" is not available`, 400);
    }

    return {
      menuItem: menu.id,
      name: menu.name,
      price: Number(menu.price),
      quantity: normalizeQuantity(item.quantity),
      calories: menu.calories,
      proteinG: menu.protein_g,
      carbsG: menu.carbs_g,
      fatG: menu.fat_g,
      sugarG: menu.sugar_g,
      fiberG: menu.fiber_g,
      dietaryTags: menu.dietary_tags || [],
      allergens: menu.allergens || [],
    };
  });
}

/** Create order from cart — status CREATED → PAYMENT_PENDING (LLD section 32). */
async function createFromCart({ user, restaurant, items, deliveryAddress }) {
  if (!user || !restaurant) throw new AppError('user and restaurant are required', 400);
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('items must be a non-empty array', 400);
  }

  const cartItems = pickCartItems(items);

  const restaurantRow = await restaurantRepository.findById(restaurant);
  if (!restaurantRow?.is_active) throw new AppError('Restaurant is not available', 400);

  const menuIds = [...new Set(cartItems.map((item) => item.menuItem))];
  const menuById = await restaurantRepository.findMenuItemsByIds(menuIds);
  const resolvedItems = resolveCartItems(cartItems, restaurant, menuById);

  const isSelectMember = await membershipService.isSelectMember(user);
  const pricing = pricingService.calculateOrderTotal(resolvedItems, { isSelectMember });
  let etaMinutes = 35;
  const deliveryLat = deliveryAddress?.lat ?? null;
  const deliveryLng = deliveryAddress?.lng ?? null;

  if (restaurantRow.latitude != null && deliveryLat != null) {
    const distanceKm = geoService.haversineKm(
      restaurantRow.latitude, restaurantRow.longitude, deliveryLat, deliveryLng
    );
    etaMinutes = geoService.calculateEtaMinutes(distanceKm);
  }

  const record = await orderRepository.createWithItems({
    userId: user,
    restaurantId: restaurant,
    items: resolvedItems,
    totalAmount: pricing.totalAmount,
    deliveryAddress,
    deliveryLat,
    deliveryLng,
    etaMinutes,
    estimatedDeliveryAt: new Date(Date.now() + etaMinutes * 60 * 1000),
    initialStatus: OrderStatus.CREATED,
  });

  await transition(record.row.id, OrderStatus.PAYMENT_PENDING);

  return getById(record.row.id);
}

/** Orchestrated place-order + payment (LLD section 32). */
async function placeOrder(cartData, paymentRequest) {
  const order = await createFromCart(cartData);
  const paymentResult = await paymentService.pay(order.id, order.totalAmount, paymentRequest);

  if (!paymentResult.success) {
    await cancellationService.cancel(order.id, { reason: 'payment_failed' });
    throw new AppError('Payment failed', 402);
  }

  await transition(order.id, OrderStatus.CONFIRMED);
  return getById(order.id);
}

/** State-guarded transition — only legal moves allowed (LLD section 40). */
async function transition(id, newStatus) {
  if (!Object.values(OrderStatus).includes(newStatus)) {
    throw new AppError(`Invalid status "${newStatus}"`, 400);
  }

  const existing = await orderRepository.findById(id);
  if (!existing) throw new AppError('Order not found', 404);

  const current = existing.row.status;
  assertTransition(current, newStatus);

  const updated = await orderRepository.updateStatus(id, newStatus, [current]);
  if (!updated) throw new AppError('Order status changed concurrently — retry', 409);

  const order = toOrderDTO(await orderRepository.findById(id));

  await eventPublisher.publish({
    type: 'order.status_changed',
    payload: { order, previousStatus: current, newStatus },
  });

  if (newStatus === OrderStatus.READY_FOR_PICKUP) {
    try {
      await deliveryService.assignDelivery(order);
      await transition(id, OrderStatus.OUT_FOR_DELIVERY);
      const updatedOrder = await getById(id);
      await deliveryService.startLiveTracking(updatedOrder);
      return updatedOrder;
    } catch (err) {
      console.warn('Delivery assignment deferred:', err.message);
    }
  }

  if (newStatus === OrderStatus.DELIVERED || newStatus === OrderStatus.CANCELLED) {
    socketService.stopDriverSimulation(id);
  }

  return order;
}

/** Restaurant workflow shortcuts (LLD section 16). */
async function acceptOrder(id) {
  const order = await getById(id);
  if (order.status === OrderStatus.CONFIRMED) {
    return transition(id, OrderStatus.RESTAURANT_ACCEPTED);
  }
  if (order.status === OrderStatus.RESTAURANT_ACCEPTED) return order;
  throw new AppError(`Cannot accept order in status "${order.status}"`, 409);
}

async function rejectOrder(id) {
  return cancellationService.cancel(id, { reason: 'restaurant_rejected' });
}

async function startPreparing(id) {
  const order = await getById(id);
  if (order.status === OrderStatus.RESTAURANT_ACCEPTED) {
    return transition(id, OrderStatus.PREPARING);
  }
  if (order.status === OrderStatus.PREPARING) return order;
  throw new AppError(`Cannot start preparing in status "${order.status}"`, 409);
}

async function markReady(id) {
  const order = await getById(id);
  if (order.status === OrderStatus.PREPARING) {
    return transition(id, OrderStatus.READY_FOR_PICKUP);
  }
  throw new AppError(`Cannot mark ready in status "${order.status}"`, 409);
}

async function getRestaurantStats(restaurantId) {
  const stats = await orderRepository.getRestaurantStats(restaurantId);
  const menu = await restaurantRepository.getMenu(restaurantId);
  return {
    totalOrders: stats.total_orders,
    pendingOrders: stats.pending_orders,
    todayRevenue: Number(stats.today_revenue),
    totalMenuItems: menu.length,
  };
}

// Legacy alias
async function create(body) {
  return createFromCart(body);
}

async function updateStatus(id, newStatus) {
  return transition(id, newStatus);
}

module.exports = {
  getById,
  listForUser,
  listForRestaurant,
  create,
  createFromCart,
  placeOrder,
  transition,
  updateStatus,
  acceptOrder,
  rejectOrder,
  startPreparing,
  markReady,
  cancel: cancellationService.cancel,
  getRestaurantStats,
  TRANSITIONS,
  LABELS,
};
