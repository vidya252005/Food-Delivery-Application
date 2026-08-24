const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');
const restaurantRepository = require('../repositories/restaurantRepository');
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

async function registerUser({ name, email, password, phone }) {
  const existing = await userRepository.findByEmail(email);
  if (existing) throw new AppError('User already exists', 400);

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await userRepository.create({ name, email, passwordHash, phone });
  const token = signToken(user.id, 'user');
  return { token, user: toAuthUser(user) };
}

async function loginUser({ email, password }) {
  if (!email || !password) throw new AppError('Please provide email and password', 400);

  const user = await userRepository.findByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new AppError('Incorrect email or password', 401);
  }

  const token = signToken(user.id, user.role === 'admin' ? 'admin' : 'user');
  return { token, user: { ...toAuthUser(user), role: user.role || 'user' } };
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

module.exports = {
  registerUser,
  loginUser,
  loginAdmin,
  registerRestaurant,
  loginRestaurant,
};
