const membershipRepository = require('../repositories/membershipRepository');
const restaurantRepository = require('../repositories/restaurantRepository');
const { mapRestaurant } = require('../utils/mappers');
const selectEligibilityService = require('./selectEligibilityService');
const { MembershipTier } = require('../domain/enums');

const SELECT_BENEFITS = [
  { id: 'free_delivery', title: 'Free delivery', description: 'No delivery fee on every order' },
  { id: 'select_restaurants', title: 'Exclusive partners', description: 'Access to FoodClub Select restaurants' },
  { id: 'member_discount', title: '5% member savings', description: 'Automatic discount at checkout' },
  { id: 'priority_support', title: 'Priority support', description: 'Faster response on order issues' },
];

function mapMembership(row) {
  if (!row) return { tier: MembershipTier.BASIC, status: 'none', active: false };
  return {
    id: row.id,
    tier: row.tier,
    status: row.status,
    startDate: row.start_date,
    expiryDate: row.expiry_date,
    active: row.status === 'active',
  };
}

async function getMembership(userId) {
  const row = await membershipRepository.findActiveByUserId(userId);
  return mapMembership(row);
}

async function subscribe(userId) {
  const row = await membershipRepository.subscribe(userId, MembershipTier.SELECT);
  return mapMembership(row);
}

async function cancel(userId) {
  const row = await membershipRepository.cancel(userId);
  return mapMembership(row);
}

function getBenefits() {
  return SELECT_BENEFITS;
}

async function listSelectRestaurants(lat, lng, radiusKm = 15) {
  const rows = await restaurantRepository.findSelectEligible(lat, lng, radiusKm);
  return rows.map((r) => {
    const mapped = mapRestaurant(r, []);
    mapped.selectEligible = true;
    return mapped;
  });
}

async function isSelectMember(userId) {
  return membershipRepository.isSelectMember(userId);
}

module.exports = {
  getMembership,
  subscribe,
  cancel,
  getBenefits,
  listSelectRestaurants,
  isSelectMember,
  mapMembership,
  SELECT_BENEFITS,
};
