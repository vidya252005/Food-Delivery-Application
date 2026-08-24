const feedbackRepository = require('../repositories/feedbackRepository');
const { mapFeedback } = require('../utils/mappers');
const AppError = require('../utils/AppError');

async function create({ orderId, userId, restaurantId, rating, foodQuality, deliverySpeed, comment }) {
  const existing = await feedbackRepository.findByOrderId(orderId);
  if (existing) throw new AppError('Feedback already submitted for this order', 400);

  const created = await feedbackRepository.create({
    orderId,
    userId,
    restaurantId,
    rating,
    foodQuality,
    deliverySpeed,
    comment,
  });
  return mapFeedback(created);
}

async function getForOrder(orderId) {
  const row = await feedbackRepository.findByOrderId(orderId);
  return mapFeedback(row);
}

async function getForRestaurant(restaurantId) {
  const rows = await feedbackRepository.findByRestaurant(restaurantId);
  return rows.map(mapFeedback);
}

module.exports = { create, getForOrder, getForRestaurant };
