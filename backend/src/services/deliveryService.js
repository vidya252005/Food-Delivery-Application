const deliveryRepository = require('../repositories/deliveryRepository');
const deliveryPartnerRepository = require('../repositories/deliveryPartnerRepository');
const orderRepository = require('../repositories/orderRepository');
const { NearestPartnerStrategy } = require('../strategies/delivery/NearestPartnerStrategy');
const { DeliveryPartnerStatus, DeliveryStatus, OrderStatus } = require('../domain/enums');
const { eventPublisher } = require('../events/EventPublisher');
const socketService = require('./socketService');
const AppError = require('../utils/AppError');

const assignmentStrategy = new NearestPartnerStrategy();

/**
 * DeliveryService — assigns partners when order is READY_FOR_PICKUP (LLD section 26).
 */
async function assignDelivery(order) {
  const existing = await deliveryRepository.findByOrderId(order.id);
  if (existing?.partner_id) return existing;

  const pickup = order.restaurantLocation;
  if (!pickup?.lat) throw new AppError('Restaurant location required for delivery assignment', 400);

  const partners = await deliveryPartnerRepository.findAvailableNear(pickup.lat, pickup.lng);
  if (!partners.length) throw new AppError('No delivery partners available nearby', 503);

  const partner = assignmentStrategy.assign(order, partners);
  if (!partner) throw new AppError('Could not assign delivery partner', 503);

  let delivery = existing;
  if (!delivery) {
    delivery = await deliveryRepository.create({
      orderId: order.id,
      pickupLat: pickup.lat,
      pickupLng: pickup.lng,
      dropLat: order.deliveryLocation?.lat,
      dropLng: order.deliveryLocation?.lng,
    });
  }

  await deliveryRepository.assignPartner(delivery.id, partner.id);
  await deliveryPartnerRepository.updateStatus(partner.id, DeliveryPartnerStatus.ASSIGNED);

  return { delivery, partner };
}

async function markPickedUp(orderId, partnerId) {
  const delivery = await deliveryRepository.findByOrderId(orderId);
  if (!delivery || delivery.partner_id !== partnerId) {
    throw new AppError('Delivery not found for this partner', 404);
  }
  await deliveryRepository.updateStatus(delivery.id, DeliveryStatus.PICKED_UP);
  await deliveryPartnerRepository.updateStatus(partnerId, DeliveryPartnerStatus.PICKED_UP);
  return delivery;
}

async function markDelivered(orderId, partnerId) {
  const delivery = await deliveryRepository.findByOrderId(orderId);
  if (!delivery) throw new AppError('Delivery not found', 404);
  await deliveryRepository.updateStatus(delivery.id, DeliveryStatus.DELIVERED);
  if (partnerId) {
    await deliveryPartnerRepository.updateStatus(partnerId, DeliveryPartnerStatus.AVAILABLE);
  }
  return delivery;
}

async function startLiveTracking(order) {
  if (!order.restaurantLocation || !order.deliveryLocation) return;

  await orderRepository.updateDriverLocation(
    order.id,
    order.restaurantLocation.lat,
    order.restaurantLocation.lng
  );

  socketService.startDriverSimulation(
    order.id,
    order.restaurantLocation,
    order.deliveryLocation,
    async () => {
      const orderService = require('./orderService');
      try {
        await orderService.transition(order.id, OrderStatus.DELIVERED);
      } catch { /* already delivered */ }
    }
  );
}

module.exports = { assignDelivery, markPickedUp, markDelivered, startLiveTracking };
