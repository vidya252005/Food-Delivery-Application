const orderService = require('../services/orderService');
const paymentService = require('../services/paymentService');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const create = asyncHandler(async (req, res) => {
  const order = await orderService.create(req.body);
  res.status(201).json(order);
});

const placeOrder = asyncHandler(async (req, res) => {
  const { cart, payment } = req.body;
  const order = await orderService.placeOrder(cart, payment);
  res.status(201).json(order);
});

const getById = asyncHandler(async (req, res) => {
  const order = await orderService.getById(req.params.id);
  if (!order) throw new AppError('Order not found', 404);
  res.json(order);
});

const listForUser = asyncHandler(async (req, res) => {
  res.json(await orderService.listForUser(req.params.userId));
});

const listForRestaurant = asyncHandler(async (req, res) => {
  res.json(await orderService.listForRestaurant(req.params.restaurantId, req.query.status));
});

const updateStatus = asyncHandler(async (req, res) => {
  res.json(await orderService.transition(req.params.id, req.body.status));
});

const pay = asyncHandler(async (req, res) => {
  const order = await orderService.getById(req.params.id);
  if (!order) throw new AppError('Order not found', 404);

  const result = await paymentService.pay(order.id, order.totalAmount, req.body);
  if (result.success) {
    await orderService.transition(req.params.id, 'confirmed');
  }
  res.json({ payment: result, order: await orderService.getById(req.params.id) });
});

const cancel = asyncHandler(async (req, res) => {
  res.json(await orderService.cancel(req.params.id, req.body));
});

const accept = asyncHandler(async (req, res) => {
  res.json(await orderService.acceptOrder(req.params.id));
});

const reject = asyncHandler(async (req, res) => {
  res.json(await orderService.rejectOrder(req.params.id));
});

const startPreparing = asyncHandler(async (req, res) => {
  res.json(await orderService.startPreparing(req.params.id));
});

const markReady = asyncHandler(async (req, res) => {
  res.json(await orderService.markReady(req.params.id));
});

const getTracking = asyncHandler(async (req, res) => {
  const order = await orderService.getById(req.params.id);
  if (!order) throw new AppError('Order not found', 404);
  const deliveryRepository = require('../repositories/deliveryRepository');
  const delivery = await deliveryRepository.findByOrderId(req.params.id);
  res.json({ order, delivery });
});

module.exports = {
  create, placeOrder, getById, listForUser, listForRestaurant,
  updateStatus, pay, cancel, accept, reject, startPreparing, markReady, getTracking,
};
