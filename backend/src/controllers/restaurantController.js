const restaurantService = require('../services/restaurantService');
const orderService = require('../services/orderService');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

/* ---------------- Public ---------------- */

const listActive = asyncHandler(async (req, res) => {
  res.json(await restaurantService.listActive());
});

const listNearby = asyncHandler(async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const radius = parseFloat(req.query.radius || '15');
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    throw new AppError('lat and lng query parameters are required', 400);
  }
  res.json(await restaurantService.listNearby(lat, lng, radius));
});

const discover = asyncHandler(async (req, res) => {
  res.json(await restaurantService.discover(req.query));
});

const search = asyncHandler(async (req, res) => {
  res.json(await restaurantService.search(req.params.query));
});

const getById = asyncHandler(async (req, res) => {
  const restaurant = await restaurantService.getById(req.params.id);
  if (!restaurant) throw new AppError('Restaurant not found', 404);
  res.json(restaurant);
});

/* ---------------- Authenticated (restaurant's own account) ---------------- */

const getOwnMenu = asyncHandler(async (req, res) => {
  res.json(await restaurantService.getMenu(req.restaurantId));
});

const addMenuItem = asyncHandler(async (req, res) => {
  const item = await restaurantService.addMenuItem(req.restaurantId, req.body);
  res.status(201).json(item);
});

const updateMenuItem = asyncHandler(async (req, res) => {
  const item = await restaurantService.updateMenuItem(req.restaurantId, req.params.menuItemId, req.body);
  res.json(item);
});

const deleteMenuItem = asyncHandler(async (req, res) => {
  await restaurantService.deleteMenuItem(req.restaurantId, req.params.menuItemId);
  res.json({ message: 'Menu item deleted successfully' });
});

const getStats = asyncHandler(async (req, res) => {
  res.json(await orderService.getRestaurantStats(req.restaurantId));
});

const getOwnOrders = asyncHandler(async (req, res) => {
  res.json(await orderService.listForRestaurant(req.restaurantId));
});

const verificationService = require('../services/verificationService');

const getOwnProfile = asyncHandler(async (req, res) => {
  const restaurant = await restaurantService.getById(req.restaurantId);
  if (!restaurant) throw new AppError('Restaurant not found', 404);
  res.json(restaurant);
});

const getVerificationStatus = asyncHandler(async (req, res) => {
  res.json(await verificationService.getStatus(req.restaurantId));
});

const submitVerification = asyncHandler(async (req, res) => {
  const result = await verificationService.submitRequest(req.restaurantId, req.body);
  res.status(201).json(result);
});

const updateProfile = asyncHandler(async (req, res) => {
  res.json(await restaurantService.updateProfile(req.restaurantId, req.body));
});

module.exports = {
  listActive,
  listNearby,
  discover,
  search,
  getById,
  getOwnMenu,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getStats,
  getOwnOrders,
  getOwnProfile,
  getVerificationStatus,
  submitVerification,
  updateProfile,
};
