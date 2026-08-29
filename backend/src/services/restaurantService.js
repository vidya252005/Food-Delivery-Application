const restaurantRepository = require('../repositories/restaurantRepository');
const { mapRestaurant, mapMenuItem } = require('../utils/mappers');
const AppError = require('../utils/AppError');
const { apiCache } = require('../utils/ttlCache');
const geocodeService = require('./geocodeService');

function cacheKey(prefix, obj) {
  return `${prefix}:${JSON.stringify(obj)}`;
}

function normalizeProfileFields(fields) {
  const normalized = { ...fields };
  if (typeof normalized.address === 'string') {
    normalized.address = { street: normalized.address };
  }
  if (typeof normalized.cuisine === 'string') {
    normalized.cuisine = normalized.cuisine
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
  }
  return normalized;
}

async function geocodeAndApplyCoords(restaurantId, address, fields) {
  const existing = await restaurantRepository.findById(restaurantId);
  if (!existing) return fields;

  const mergedAddress = {
    street: address.street ?? existing.street,
    city: address.city ?? existing.city,
    state: address.state ?? existing.state,
    zipCode: address.zipCode ?? existing.zip_code,
  };
  const coords = await geocodeService.geocodeAddress(mergedAddress);
  if (coords) {
    return { ...fields, latitude: coords.lat, longitude: coords.lng };
  }
  return fields;
}

/** Geocode address and seed a starter quality profile so discover/nearby work. */
async function provisionNewRestaurant(restaurantId, address) {
  let fields = {};
  if (address) {
    fields = await geocodeAndApplyCoords(restaurantId, address, fields);
  }
  if (fields.latitude != null) {
    await restaurantRepository.updateProfile(restaurantId, fields);
  }
  await restaurantRepository.createQualityProfile(restaurantId);
}

async function listActive() {
  const key = 'listActive';
  const cached = apiCache.get(key);
  if (cached) return cached;
  const rows = await restaurantRepository.findActive();
  const result = rows.map((r) => mapRestaurant(r, []));
  apiCache.set(key, result, 120_000);
  return result;
}

async function getById(id) {
  const restaurant = await restaurantRepository.findById(id);
  if (!restaurant) return null;
  const menu = await restaurantRepository.getMenu(id);
  return mapRestaurant(restaurant, menu);
}

async function listNearby(lat, lng, radiusKm = 15) {
  const key = cacheKey('nearby', { lat: +lat.toFixed(3), lng: +lng.toFixed(3), radiusKm });
  const cached = apiCache.get(key);
  if (cached) return cached;
  const rows = await restaurantRepository.findNearby(lat, lng, radiusKm);
  const result = rows.map((r) => mapRestaurant(r, []));
  apiCache.set(key, result, 60_000);
  return result;
}

async function search(term) {
  const rows = await restaurantRepository.search(term);
  return rows.map((r) => mapRestaurant(r, []));
}

async function discover(query) {
  const dietaryTags = query.dietaryTag
    ? (Array.isArray(query.dietaryTag) ? query.dietaryTag : [query.dietaryTag])
    : [];
  const excludedAllergens = query.allergen
    ? (Array.isArray(query.allergen) ? query.allergen : [query.allergen])
    : [];

  const filters = {
    keyword: query.keyword || query.q || '',
    lat: query.lat != null ? parseFloat(query.lat) : null,
    lng: query.lng != null ? parseFloat(query.lng) : null,
    radiusKm: query.radius != null ? parseFloat(query.radius) : 15,
    dietaryTags,
    excludedAllergens,
    minQualityScore: query.minQualityScore != null ? parseInt(query.minQualityScore, 10) : null,
    selectOnly: query.selectOnly === 'true' || query.selectOnly === true,
    maxCalories: query.maxCalories != null ? parseInt(query.maxCalories, 10) : null,
  };
  const key = cacheKey('discover', filters);
  const cached = apiCache.get(key);
  if (cached) return cached;

  const rows = await restaurantRepository.discover(filters);
  const result = rows.map((r) => mapRestaurant(r, []));
  apiCache.set(key, result, 45_000);
  return result;
}

async function listSelectEligible(lat, lng, radiusKm = 15) {
  const rows = await restaurantRepository.findSelectEligible(lat, lng, radiusKm);
  return rows.map((r) => mapRestaurant(r, []));
}

async function getMenu(restaurantId) {
  const rows = await restaurantRepository.getMenu(restaurantId);
  return rows.map(mapMenuItem);
}

async function addMenuItem(restaurantId, item) {
  const restaurant = await restaurantRepository.findById(restaurantId);
  if (!restaurant) throw new AppError('Restaurant not found', 404);

  const created = await restaurantRepository.addMenuItem(restaurantId, item);
  return mapMenuItem(created);
}

async function updateMenuItem(restaurantId, menuItemId, fields) {
  const updated = await restaurantRepository.updateMenuItem(restaurantId, menuItemId, fields);
  if (!updated) throw new AppError('Menu item not found', 404);
  return mapMenuItem(updated);
}

async function deleteMenuItem(restaurantId, menuItemId) {
  const deleted = await restaurantRepository.deleteMenuItem(restaurantId, menuItemId);
  if (!deleted) throw new AppError('Menu item not found', 404);
}

async function updateProfile(restaurantId, fields) {
  // eslint-disable-next-line no-unused-vars
  const { password, email, ...safeFields } = fields; // password/email changes go through authService, not here
  let normalized = normalizeProfileFields(safeFields);
  if (normalized.address) {
    normalized = await geocodeAndApplyCoords(restaurantId, normalized.address, normalized);
  }
  const updated = await restaurantRepository.updateProfile(restaurantId, normalized);
  if (!updated) throw new AppError('Restaurant not found', 404);
  return mapRestaurant(updated, []);
}

module.exports = {
  listActive,
  listNearby,
  getById,
  search,
  discover,
  listSelectEligible,
  getMenu,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  updateProfile,
  provisionNewRestaurant,
};
