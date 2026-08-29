const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');
const restaurantRepository = require('../repositories/restaurantRepository');
const restaurantService = require('./restaurantService');
const deliveryPartnerRepository = require('../repositories/deliveryPartnerRepository');
const AppError = require('../utils/AppError');
const env = require('../config/env');

const SALT_ROUNDS = 12; // matches the original Mongoose pre-save hook

function signToken(id, role) {
  return jwt.sign({ id, role }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}

// Auth responses intentionally return only {id, name, email} - matches the
// original API contract exactly (full profile detail belongs to the
// restaurant/user services, not the login/register payload).
const toAuthUser = (user) => ({ id: user.id, name: user.name, email: user.email });
const toAuthRestaurant = (restaurant) => ({ id: restaurant.id, name: restaurant.name, email: restaurant.email });

/** JWT/API role — app uses 'user' | 'admin', not LLD 'customer'. */
function roleForUser(user) {
  return user.role === 'admin' ? 'admin' : 'user';
}

async function registerUser({ name, email, password, phone }) {
  const existing = await userRepository.findByEmail(email);
  if (existing) throw new AppError('User already exists', 400);

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await userRepository.create({ name, email, passwordHash, phone });
  const role = roleForUser(user);
  const token = signToken(user.id, role);
  return { token, user: { ...toAuthUser(user), role } };
}

async function loginUser({ email, password }) {
  if (!email || !password) throw new AppError('Please provide email and password', 400);

  const user = await userRepository.findByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new AppError('Incorrect email or password', 401);
  }

  const token = signToken(user.id, roleForUser(user));
  return { token, user: { ...toAuthUser(user), role: roleForUser(user) } };
}

async function loginAdmin({ email, password }) {
  if (!email || !password) throw new AppError('Please provide email and password', 400);

  const user = await userRepository.findByEmail(email);
  if (!user || user.role !== 'admin' || !(await bcrypt.compare(password, user.password_hash))) {
    throw new AppError('Incorrect admin credentials', 401);
  }

  const token = signToken(user.id, 'admin');
  return { token, user: { ...toAuthUser(user), role: 'admin' } };
}

async function registerRestaurant({ name, email, password, phone, cuisine, address }) {
  const existing = await restaurantRepository.findByEmail(email);
  if (existing) throw new AppError('Restaurant already exists', 400);

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const restaurant = await restaurantRepository.create({ name, email, passwordHash, phone, cuisine, address });
  await restaurantService.provisionNewRestaurant(restaurant.id, address);
  const token = signToken(restaurant.id, 'restaurant');
  return { token, restaurant: toAuthRestaurant(restaurant) };
}

async function loginRestaurant({ email, password }) {
  if (!email || !password) throw new AppError('Please provide email and password', 400);

  const restaurant = await restaurantRepository.findByEmail(email);
  if (!restaurant || !(await bcrypt.compare(password, restaurant.password_hash))) {
    throw new AppError('Incorrect email or password', 401);
  }

  const token = signToken(restaurant.id, 'restaurant');
  return { token, restaurant: toAuthRestaurant(restaurant) };
}

const toAuthDeliveryPartner = (partner) => ({
  id: partner.id,
  name: partner.name,
  email: partner.email,
});

async function loginDeliveryPartner({ email, password }) {
  if (!email || !password) throw new AppError('Please provide email and password', 400);

  const partner = await deliveryPartnerRepository.findByEmail(email);
  if (!partner || !(await bcrypt.compare(password, partner.password_hash))) {
    throw new AppError('Incorrect email or password', 401);
  }

  const token = signToken(partner.id, 'delivery_partner');
  return { token, partner: toAuthDeliveryPartner(partner) };
}

module.exports = {
  registerUser,
  loginUser,
  loginAdmin,
  registerRestaurant,
  loginRestaurant,
  loginDeliveryPartner,
};
