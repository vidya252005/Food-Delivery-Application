const deliveryPartnerRepository = require('../repositories/deliveryPartnerRepository');
const deliveryService = require('../services/deliveryService');
const orderService = require('../services/orderService');
const { OrderStatus } = require('../domain/enums');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const listAvailable = asyncHandler(async (req, res) => {
  const lat = parseFloat(req.query.lat || '12.9716');
  const lng = parseFloat(req.query.lng || '77.5946');
  res.json(await deliveryPartnerRepository.findAvailableNear(lat, lng));
});

const setAvailability = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const updated = await deliveryPartnerRepository.updateStatus(req.partnerId, status);
  if (!updated) throw new AppError('Partner not found', 404);
  res.json(updated);
});

const updateLocation = asyncHandler(async (req, res) => {
  const { lat, lng } = req.body;
  const updated = await deliveryPartnerRepository.updateLocation(req.partnerId, lat, lng);
  if (!updated) throw new AppError('Partner not found', 404);
  res.json(updated);
});

const pickUp = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  await deliveryService.markPickedUp(orderId, req.partnerId);
  await orderService.transition(orderId, OrderStatus.OUT_FOR_DELIVERY);
  res.json(await orderService.getById(orderId));
});

const completeDelivery = asyncHandler(async (req, res) => {
  const { orderId } = req.body;
  await deliveryService.markDelivered(orderId, req.partnerId);
  res.json(await orderService.transition(orderId, OrderStatus.DELIVERED));
});

module.exports = {
  listAvailable, setAvailability, updateLocation, pickUp, completeDelivery,
};
