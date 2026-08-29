const membershipRepository = require('../repositories/membershipRepository');
const restaurantRepository = require('../repositories/restaurantRepository');
const paymentRepository = require('../repositories/paymentRepository');
const { getPaymentStrategy } = require('../strategies/payment/PaymentStrategyFactory');
const { mapRestaurant } = require('../utils/mappers');
const Money = require('../domain/money');
const AppError = require('../utils/AppError');
const { pickPaymentRequest } = require('../utils/sanitize');
const { MembershipTier, PaymentMethod, PaymentStatus } = require('../domain/enums');

const SELECT_MONTHLY_PRICE_RUPEES = 99;

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

async function chargeSelectSubscription(userId, paymentRequest) {
  const payload = pickPaymentRequest(paymentRequest);
  if (!payload.idempotencyKey || !payload.method) {
    throw new AppError('Payment method and idempotencyKey are required', 400);
  }
  if (payload.method === PaymentMethod.COD) {
    throw new AppError('Select membership cannot be paid with cash on delivery', 400);
  }

  const existing = await paymentRepository.findByIdempotencyKey(payload.idempotencyKey);
  if (existing) {
    if (existing.status !== PaymentStatus.SUCCESS) {
      throw new AppError('Payment failed', 402);
    }
    return existing;
  }

  const money = Money.fromRupees(SELECT_MONTHLY_PRICE_RUPEES);
  const strategy = getPaymentStrategy(payload.method);
  const payment = await paymentRepository.create({
    orderId: null,
    amountPaise: money.amountPaise,
    method: payload.method,
    status: PaymentStatus.INITIATED,
    idempotencyKey: payload.idempotencyKey,
  });

  try {
    const result = await strategy.pay(`membership_${userId}`, money, payload);
    if (!result.success) {
      await paymentRepository.updateStatus(payment.id, PaymentStatus.FAILED);
      throw new AppError(result.message || 'Payment failed', 402);
    }
    return paymentRepository.updateStatus(payment.id, PaymentStatus.SUCCESS, result.transactionId);
  } catch (err) {
    if (!(err instanceof AppError)) {
      await paymentRepository.updateStatus(payment.id, PaymentStatus.FAILED);
    }
    throw err;
  }
}

async function subscribe(userId, paymentRequest) {
  await chargeSelectSubscription(userId, paymentRequest);
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
  SELECT_MONTHLY_PRICE_RUPEES,
};
