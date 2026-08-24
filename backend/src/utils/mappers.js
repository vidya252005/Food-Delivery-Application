/**
 * Every mapper below intentionally omits password_hash - responses are
 * shaped explicitly here rather than relying on an ORM's "hide this
 * field" flag, so there's no code path that can accidentally leak it.
 *
 * Field names mirror the original Mongoose API contract (id is also
 * exposed as _id, addresses nest under `address`, timestamps stay
 * `createdAt`/`updatedAt`) so the existing React frontend keeps working
 * against the new Postgres-backed API without any changes.
 */

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    _id: row.id,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatar_url,
    address: {
      street: row.street,
      city: row.city,
      state: row.state,
      zipCode: row.zip_code,
    },
    location: row.latitude != null ? { lat: row.latitude, lng: row.longitude } : null,
    phone: row.phone,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapQualityProfile(row) {
  if (!row || row.qp_overall_score == null) return null;
  return {
    overallScore: row.qp_overall_score,
    ingredientScore: row.qp_ingredient_score,
    transparencyScore: row.qp_transparency_score,
    foodSafetyScore: row.qp_food_safety_score,
    consistencyScore: row.qp_consistency_score,
    badges: row.qp_badges || [],
  };
}

function mapNutritionProfile(row) {
  if (!row || row.calories == null) return null;
  return {
    calories: row.calories,
    proteinGrams: row.protein_g != null ? Number(row.protein_g) : null,
    carbohydrateGrams: row.carbs_g != null ? Number(row.carbs_g) : null,
    fatGrams: row.fat_g != null ? Number(row.fat_g) : null,
    sugarGrams: row.sugar_g != null ? Number(row.sugar_g) : null,
    fiberGrams: row.fiber_g != null ? Number(row.fiber_g) : null,
  };
}

function mapRestaurant(row, menuRows, extras = {}) {
  if (!row) return null;
  const geoService = require('../services/geoService');
  const selectEligibilityService = require('../services/selectEligibilityService');
  const distanceKm = extras.distanceKm ?? (row.distance_km != null ? Number(row.distance_km) : null);
  const etaMinutes = extras.etaMinutes ?? (distanceKm != null
    ? geoService.calculateEtaMinutes(distanceKm)
    : null);
  const qualityProfile = mapQualityProfile(row);
  return {
    id: row.id,
    _id: row.id,
    name: row.name,
    email: row.email,
    description: row.description,
    cuisine: row.cuisine || [],
    address: {
      street: row.street,
      city: row.city,
      state: row.state,
      zipCode: row.zip_code,
    },
    location: row.latitude != null ? { lat: row.latitude, lng: row.longitude } : null,
    phone: row.phone,
    image: row.image,
    menu: (menuRows || []).map(mapMenuItem),
    deliveryTime: row.delivery_time,
    minOrder: Number(row.min_order),
    rating: Number(row.rating),
    customerRating: Number(row.rating),
    isActive: row.is_active,
    verificationStatus: row.verification_status || 'pending',
    supportedDietaryTags: row.supported_dietary_tags || [],
    qualityProfile,
    qualityScore: qualityProfile?.overallScore ?? null,
    selectEligible: selectEligibilityService.isSelectEligible({
      verificationStatus: row.verification_status,
      qualityProfile,
      qp_overall_score: row.qp_overall_score,
    }),
    distanceKm,
    etaMinutes,
    etaLabel: etaMinutes ? geoService.formatEta(etaMinutes) : row.delivery_time,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMenuItem(row) {
  if (!row) return null;
  return {
    id: row.id,
    _id: row.id,
    restaurantId: row.restaurant_id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    category: row.category,
    image: row.image,
    available: row.available,
    nutritionProfile: mapNutritionProfile(row),
    dietaryTags: row.dietary_tags || [],
    allergens: row.allergens || [],
    preparationTime: row.prep_time_minutes,
  };
}

function mapOrderItem(row) {
  const item = {
    id: row.id,
    _id: row.id,
    menuItem: row.menu_item_id,
    name: row.name,
    price: Number(row.price),
    quantity: row.quantity,
  };
  const nutritionProfile = mapNutritionProfile(row);
  if (nutritionProfile) item.nutritionProfile = nutritionProfile;
  if (row.dietary_tags?.length) item.dietaryTags = row.dietary_tags;
  if (row.allergens?.length) item.allergens = row.allergens;
  return item;
}

function computeNutritionSummary(items) {
  const summary = {
    calories: 0,
    proteinGrams: 0,
    carbohydrateGrams: 0,
    fatGrams: 0,
    hasData: false,
  };

  for (const item of items || []) {
    const nutrition = item.nutritionProfile;
    if (!nutrition?.calories) continue;
    summary.hasData = true;
    const qty = item.quantity || 1;
    summary.calories += (nutrition.calories || 0) * qty;
    summary.proteinGrams += (nutrition.proteinGrams || 0) * qty;
    summary.carbohydrateGrams += (nutrition.carbohydrateGrams || 0) * qty;
    summary.fatGrams += (nutrition.fatGrams || 0) * qty;
  }

  if (!summary.hasData) return null;

  return {
    calories: Math.round(summary.calories),
    proteinGrams: Math.round(summary.proteinGrams),
    carbohydrateGrams: Math.round(summary.carbohydrateGrams),
    fatGrams: Math.round(summary.fatGrams),
  };
}

/**
 * `row` may optionally carry joined `user_name`/`user_email` and
 * `restaurant_name` columns (see orderRepository list queries) - when
 * present they're nested into `user`/`restaurant` sub-objects to mirror
 * Mongoose's `.populate()` output the frontend already expects.
 */
function mapOrder(row, itemRows) {
  if (!row) return null;
  const order = {
    id: row.id,
    _id: row.id,
    user: row.user_name
      ? { id: row.user_id, _id: row.user_id, name: row.user_name, email: row.user_email }
      : row.user_id,
    restaurant: row.restaurant_name
      ? { id: row.restaurant_id, _id: row.restaurant_id, name: row.restaurant_name }
      : row.restaurant_id,
    items: (itemRows || []).map(mapOrderItem),
    totalAmount: Number(row.total_amount),
    deliveryAddress: {
      street: row.street,
      city: row.city,
      state: row.state,
      zipCode: row.zip_code,
      lat: row.delivery_lat,
      lng: row.delivery_lng,
    },
    deliveryLocation: row.delivery_lat != null
      ? { lat: row.delivery_lat, lng: row.delivery_lng }
      : null,
    driverLocation: row.driver_lat != null
      ? { lat: row.driver_lat, lng: row.driver_lng }
      : null,
    restaurantLocation: row.restaurant_lat != null
      ? { lat: row.restaurant_lat, lng: row.restaurant_lng }
      : null,
    etaMinutes: row.eta_minutes,
    estimatedDeliveryAt: row.estimated_delivery_at,
    status: row.status,
    paymentStatus: row.payment_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  const mappedItems = (itemRows || []).map(mapOrderItem);
  order.items = mappedItems;
  order.nutritionSummary = computeNutritionSummary(mappedItems);
  return order;
}

function mapFeedback(row) {
  if (!row) return null;
  return {
    id: row.id,
    _id: row.id,
    order: row.order_id,
    user: row.user_name ? { id: row.user_id, _id: row.user_id, name: row.user_name } : row.user_id,
    restaurant: row.restaurant_name
      ? { id: row.restaurant_id, _id: row.restaurant_id, name: row.restaurant_name }
      : row.restaurant_id,
    rating: row.rating,
    foodQuality: row.food_quality,
    deliverySpeed: row.delivery_speed,
    comment: row.comment,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSupportTicket(row) {
  if (!row) return null;
  return {
    id: row.id,
    _id: row.id,
    name: row.name,
    email: row.email,
    issue: row.issue,
    status: row.status,
    createdAt: row.created_at,
  };
}

module.exports = {
  mapUser,
  mapMenuItem,
  mapRestaurant,
  mapQualityProfile,
  mapNutritionProfile,
  mapOrderItem,
  mapOrder,
  mapFeedback,
  mapSupportTicket,
  computeNutritionSummary,
};
