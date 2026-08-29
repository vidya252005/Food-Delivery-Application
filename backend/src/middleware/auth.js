const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');
const restaurantRepository = require('../repositories/restaurantRepository');
const deliveryPartnerRepository = require('../repositories/deliveryPartnerRepository');
const env = require('../config/env');

function extractToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer')) {
    return header.split(' ')[1];
  }
  return null;
}

const authenticateRestaurant = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ message: 'You are not logged in! Please log in to get access.' });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (decoded.role !== 'restaurant') {
      return res.status(401).json({ message: 'Invalid token. Please log in again.' });
    }

    const restaurant = await restaurantRepository.findById(decoded.id);
    if (!restaurant) {
      return res.status(401).json({ message: 'The restaurant belonging to this token no longer exists.' });
    }

    req.restaurant = restaurant;
    req.restaurantId = restaurant.id;
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    return res.status(401).json({ message: 'Invalid token. Please log in again.' });
  }
};

const authenticateUser = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ message: 'You are not logged in! Please log in to get access.' });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (decoded.role !== 'user' && decoded.role !== 'admin') {
      return res.status(401).json({ message: 'Invalid token. Please log in again.' });
    }

    const user = await userRepository.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'The user belonging to this token no longer exists.' });
    }

    req.user = user;
    req.userId = user.id;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    return res.status(401).json({ message: 'Invalid token. Please log in again.' });
  }
};

const authenticateDeliveryPartner = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ message: 'You are not logged in! Please log in to get access.' });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (decoded.role !== 'delivery_partner') {
      return res.status(401).json({ message: 'Invalid token. Please log in again.' });
    }

    const partner = await deliveryPartnerRepository.findById(decoded.id);
    if (!partner) {
      return res.status(401).json({ message: 'The delivery partner belonging to this token no longer exists.' });
    }

    req.deliveryPartner = partner;
    req.partnerId = partner.id;
    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    return res.status(401).json({ message: 'Invalid token. Please log in again.' });
  }
};

const authenticateAdmin = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ message: 'Admin login required.' });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required.' });
    }

    const user = await userRepository.findById(decoded.id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required.' });
    }

    req.user = user;
    req.userId = user.id;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid admin token.' });
  }
};

module.exports = {
  authenticateRestaurant,
  authenticateUser,
  authenticateDeliveryPartner,
  authenticateAdmin,
};
