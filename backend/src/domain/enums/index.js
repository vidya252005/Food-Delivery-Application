/** Order lifecycle states — matches LLD section 14. */
const OrderStatus = Object.freeze({
  CREATED: 'created',
  PAYMENT_PENDING: 'payment_pending',
  CONFIRMED: 'confirmed',
  RESTAURANT_ACCEPTED: 'restaurant_accepted',
  PREPARING: 'preparing',
  READY_FOR_PICKUP: 'ready_for_pickup',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
});

const PaymentStatus = Object.freeze({
  INITIATED: 'initiated',
  SUCCESS: 'success',
  FAILED: 'failed',
  REFUNDED: 'refunded',
});

const PaymentMethod = Object.freeze({
  CARD: 'card',
  UPI: 'upi',
  WALLET: 'wallet',
  COD: 'cod',
});

const DeliveryStatus = Object.freeze({
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  PICKED_UP: 'picked_up',
  DELIVERING: 'delivering',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
});

const DeliveryPartnerStatus = Object.freeze({
  OFFLINE: 'offline',
  AVAILABLE: 'available',
  ASSIGNED: 'assigned',
  PICKED_UP: 'picked_up',
  DELIVERING: 'delivering',
});

const UserRole = Object.freeze({
  CUSTOMER: 'customer',
  RESTAURANT_OWNER: 'restaurant_owner',
  DELIVERY_PARTNER: 'delivery_partner',
});

const RestaurantStatus = Object.freeze({
  OPEN: 'open',
  CLOSED: 'closed',
  TEMPORARILY_UNAVAILABLE: 'temporarily_unavailable',
});

const VerificationStatus = Object.freeze({
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
});

const DietaryTag = Object.freeze({
  VEGETARIAN: 'vegetarian',
  VEGAN: 'vegan',
  HIGH_PROTEIN: 'high_protein',
  GLUTEN_FREE: 'gluten_free',
  LOW_SUGAR: 'low_sugar',
  ORGANIC: 'organic',
  WHOLE_FOOD: 'whole_food',
  KETO: 'keto',
});

const Allergen = Object.freeze({
  MILK: 'milk',
  EGGS: 'eggs',
  PEANUTS: 'peanuts',
  TREE_NUTS: 'tree_nuts',
  SOY: 'soy',
  WHEAT: 'wheat',
  SESAME: 'sesame',
  FISH: 'fish',
  SHELLFISH: 'shellfish',
});

const QualityBadge = Object.freeze({
  VERIFIED_RESTAURANT: 'verified_restaurant',
  NUTRITION_INFO_AVAILABLE: 'nutrition_info_available',
  VEGETARIAN_FRIENDLY: 'vegetarian_friendly',
  HIGH_PROTEIN_OPTIONS: 'high_protein_options',
  ORGANIC_OPTIONS: 'organic_options',
  CHEF_CURATED: 'chef_curated',
  SELECT_ELIGIBLE: 'select_eligible',
});

const MembershipTier = Object.freeze({
  BASIC: 'basic',
  SELECT: 'select',
});

const MembershipStatus = Object.freeze({
  ACTIVE: 'active',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
});

module.exports = {
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  DeliveryStatus,
  DeliveryPartnerStatus,
  UserRole,
  RestaurantStatus,
  VerificationStatus,
  DietaryTag,
  Allergen,
  QualityBadge,
  MembershipTier,
  MembershipStatus,
};
