const restaurantService = require('../services/restaurantService');
const membershipService = require('../services/membershipService');
const preferencesService = require('../services/preferencesService');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const discover = asyncHandler(async (req, res) => {
  res.json(await restaurantService.discover(req.query));
});

const listSelectRestaurants = asyncHandler(async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const radius = parseFloat(req.query.radius || '15');
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    throw new AppError('lat and lng query parameters are required', 400);
  }
  res.json(await membershipService.listSelectRestaurants(lat, lng, radius));
});

const getBenefits = asyncHandler(async (req, res) => {
  res.json({ benefits: membershipService.getBenefits() });
});

const getMembership = asyncHandler(async (req, res) => {
  res.json(await membershipService.getMembership(req.userId));
});

const subscribe = asyncHandler(async (req, res) => {
  const membership = await membershipService.subscribe(req.userId);
  res.status(201).json(membership);
});

const cancelMembership = asyncHandler(async (req, res) => {
  res.json(await membershipService.cancel(req.userId));
});

const getPreferences = asyncHandler(async (req, res) => {
  res.json(await preferencesService.getPreferences(req.userId));
});

const updatePreferences = asyncHandler(async (req, res) => {
  res.json(await preferencesService.updatePreferences(req.userId, req.body));
});

const getNotifications = asyncHandler(async (req, res) => {
  const notificationService = require('../services/notificationService');
  res.json(await notificationService.listForUser(req.userId));
});

const getHomeFeed = asyncHandler(async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const hasLocation = !Number.isNaN(lat) && !Number.isNaN(lng);

  const [nearby, selectRestaurants, popular] = await Promise.all([
    hasLocation
      ? restaurantService.listNearby(lat, lng)
      : restaurantService.listActive(),
    hasLocation
      ? membershipService.listSelectRestaurants(lat, lng)
      : restaurantService.discover({ selectOnly: true }),
    restaurantService.discover({ minQualityScore: 85 }),
  ]);

  res.json({
    location: req.query.city || 'Bengaluru',
    selectRestaurants: selectRestaurants.slice(0, 6),
    recommendedRestaurants: popular.slice(0, 6),
    nearbyRestaurants: nearby.slice(0, 8),
    popularRestaurants: popular.slice(0, 6),
  });
});

module.exports = {
  discover,
  listSelectRestaurants,
  getBenefits,
  getMembership,
  subscribe,
  cancelMembership,
  getPreferences,
  updatePreferences,
  getNotifications,
  getHomeFeed,
};
