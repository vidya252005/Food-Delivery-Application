const feedbackService = require('../services/feedbackService');
const asyncHandler = require('../utils/asyncHandler');

const create = asyncHandler(async (req, res) => {
  const feedback = await feedbackService.create(req.body);
  res.status(201).json(feedback);
});

const getForOrder = asyncHandler(async (req, res) => {
  res.json(await feedbackService.getForOrder(req.params.orderId));
});

const getForRestaurant = asyncHandler(async (req, res) => {
  res.json(await feedbackService.getForRestaurant(req.params.restaurantId));
});

module.exports = { create, getForOrder, getForRestaurant };
