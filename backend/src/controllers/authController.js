const authService = require('../services/authService');
const asyncHandler = require('../utils/asyncHandler');

const registerUser = asyncHandler(async (req, res) => {
  const { token, user } = await authService.registerUser(req.body);
  res.status(201).json({ status: 'success', token, data: { role: user.role, user } });
});

const loginUser = asyncHandler(async (req, res) => {
  const { token, user } = await authService.loginUser(req.body);
  res.json({ status: 'success', token, data: { role: user.role || 'user', user } });
});

const loginAdmin = asyncHandler(async (req, res) => {
  const { token, user } = await authService.loginAdmin(req.body);
  res.json({ status: 'success', token, data: { role: 'admin', user } });
});

const registerRestaurant = asyncHandler(async (req, res) => {
  const { token, restaurant } = await authService.registerRestaurant(req.body);
  res.status(201).json({ status: 'success', token, data: { role: 'restaurant', restaurant } });
});

const loginRestaurant = asyncHandler(async (req, res) => {
  const { token, restaurant } = await authService.loginRestaurant(req.body);
  res.json({ status: 'success', token, data: { role: 'restaurant', restaurant } });
});

const loginDeliveryPartner = asyncHandler(async (req, res) => {
  const { token, partner } = await authService.loginDeliveryPartner(req.body);
  res.json({ status: 'success', token, data: { role: 'delivery_partner', partner } });
});

const googleLogin = asyncHandler(async (req, res) => {
  const oauthService = require('../services/oauthService');
  const { token, user } = await oauthService.loginWithGoogle(req.body.credential);
  res.json({ status: 'success', token, data: { role: 'user', user } });
});

module.exports = {
  registerUser, loginUser, loginAdmin, registerRestaurant, loginRestaurant, loginDeliveryPartner, googleLogin,
};
