const jwt = require('jsonwebtoken');
const orderRepository = require('../repositories/orderRepository');
const env = require('../config/env');
const AppError = require('../utils/AppError');

function extractToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer')) return header.split(' ')[1];
  return null;
}

/** GET /orders/user/:userId — caller must be that user (or admin). */
function authorizeUserOrders(req, res, next) {
  if (req.userRole === 'admin') return next();
  if (req.params.userId !== req.userId) {
    return res.status(403).json({ message: 'Forbidden — you can only view your own orders' });
  }
  return next();
}

/** GET /orders/restaurant/:restaurantId — caller must be that restaurant. */
function authorizeRestaurantOrders(req, res, next) {
  if (req.params.restaurantId !== req.restaurantId) {
    return res.status(403).json({ message: 'Forbidden — you can only view your own orders' });
  }
  return next();
}

async function loadOrder(req, res, next) {
  const record = await orderRepository.findById(req.params.id);
  if (!record) throw new AppError('Order not found', 404);
  req.orderRecord = record;
  return next();
}

/** Customer who placed the order (or admin). */
function authorizeCustomerOrderOwner(req, res, next) {
  const orderUserId = req.orderRecord.row.user_id;
  if (req.userRole === 'admin') return next();
  if (req.userId !== orderUserId) {
    return res.status(403).json({ message: 'Forbidden — this order belongs to another customer' });
  }
  return next();
}

/** Restaurant that received the order. */
function authorizeRestaurantOrderOwner(req, res, next) {
  const orderRestaurantId = req.orderRecord.row.restaurant_id;
  if (req.restaurantId !== orderRestaurantId) {
    return res.status(403).json({ message: 'Forbidden — this order belongs to another restaurant' });
  }
  return next();
}

/**
 * GET /orders/:id, tracking, cancel — JWT required; user must own order,
 * restaurant must own order, or admin.
 */
async function authorizeOrderParticipant(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ message: 'You are not logged in! Please log in to get access.' });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);
    const record = req.orderRecord || await orderRepository.findById(req.params.id);
    if (!record) throw new AppError('Order not found', 404);
    req.orderRecord = record;

    const { user_id: orderUserId, restaurant_id: orderRestaurantId } = record.row;

    if (decoded.role === 'admin') {
      req.userId = decoded.id;
      req.userRole = 'admin';
      return next();
    }
    if (decoded.role === 'user') {
      if (decoded.id !== orderUserId) {
        return res.status(403).json({ message: 'Forbidden — this order belongs to another customer' });
      }
      req.userId = decoded.id;
      req.userRole = 'user';
      return next();
    }
    if (decoded.role === 'restaurant') {
      if (decoded.id !== orderRestaurantId) {
        return res.status(403).json({ message: 'Forbidden — this order belongs to another restaurant' });
      }
      req.restaurantId = decoded.id;
      return next();
    }

    return res.status(403).json({ message: 'Forbidden' });
  } catch (error) {
    if (error instanceof AppError) throw error;
    return res.status(401).json({ message: 'Invalid token. Please log in again.' });
  }
}

/** POST /orders — always bind order to the authenticated user (ignore client body.user). */
function assertOrderForAuthenticatedUser(req, res, next) {
  if (req.body?.user && req.body.user !== req.userId) {
    return res.status(403).json({ message: 'Forbidden — cannot place an order for another user' });
  }
  if (req.body?.cart?.user && req.body.cart.user !== req.userId) {
    return res.status(403).json({ message: 'Forbidden — cannot place an order for another user' });
  }
  if (req.body) req.body.user = req.userId;
  if (req.body?.cart) req.body.cart.user = req.userId;
  return next();
}

module.exports = {
  authorizeUserOrders,
  authorizeRestaurantOrders,
  loadOrder,
  authorizeCustomerOrderOwner,
  authorizeRestaurantOrderOwner,
  authorizeOrderParticipant,
  assertOrderForAuthenticatedUser,
};
