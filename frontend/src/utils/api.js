// src/utils/api.js
import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001/api',
  headers: { 'Content-Type': 'application/json' },
});

/** Attach JWT for the active session role (not "restaurant wins" blindly). */
api.interceptors.request.use((req) => {
  const role = localStorage.getItem('role');
  const restaurantToken = localStorage.getItem('restaurantToken');
  const userToken = localStorage.getItem('token');

  if (role === 'restaurant' && restaurantToken) {
    req.headers.Authorization = `Bearer ${restaurantToken}`;
  } else if (userToken) {
    req.headers.Authorization = `Bearer ${userToken}`;
  }

  return req;
});

const apiError = (err) => {
  const message =
    err.response?.data?.message ||
    err.response?.data?.error ||
    err.message ||
    'Request failed';
  return Object.assign(new Error(message), { status: err.response?.status });
};

const wrap = (fn) => fn().catch((err) => {
  throw apiError(err);
});

export const restaurantAPI = {
  getAll: () => wrap(() => api.get('/restaurants').then((r) => r.data)),

  getNearby: (lat, lng, radius = 15) =>
    wrap(() => api.get('/restaurants/nearby', { params: { lat, lng, radius } }).then((r) => r.data)),

  getById: (id) => wrap(() => api.get(`/restaurants/${id}`).then((r) => r.data)),

  search: (query) => wrap(() => api.get(`/restaurants/search/${encodeURIComponent(query)}`).then((r) => r.data)),

  discover: (params) =>
    wrap(() => api.get('/restaurants/discover', { params }).then((r) => r.data)),

  getOwnMenu: () =>
    wrap(() => api.get('/restaurant/menu').then((r) => r.data)),

  getStats: () => wrap(() => api.get('/restaurant/stats').then((r) => r.data)),

  getOwnOrders: () => wrap(() => api.get('/restaurant/orders').then((r) => r.data)),

  addMenuItem: (menuItem) =>
    wrap(() => api.post('/restaurant/menu', menuItem).then((r) => r.data)),

  updateMenuItem: (menuItemId, menuItem) =>
    wrap(() => api.put(`/restaurant/menu/${menuItemId}`, menuItem).then((r) => r.data)),

  deleteMenuItem: (menuItemId) =>
    wrap(() => api.delete(`/restaurant/menu/${menuItemId}`).then((r) => r.data)),

  getProfile: () =>
    wrap(() => api.get('/restaurant/profile').then((r) => r.data)),

  updateProfile: (data) =>
    wrap(() => api.put('/restaurant/profile', data).then((r) => r.data)),

  getVerificationStatus: () =>
    wrap(() => api.get('/restaurant/verification').then((r) => r.data)),

  submitVerification: (data) =>
    wrap(() => api.post('/restaurant/verification', data).then((r) => r.data)),
};

export const authAPI = {
  userLogin: (credentials) =>
    wrap(() => api.post('/auth/user/login', credentials).then((r) => r.data)),

  userRegister: (userData) =>
    wrap(() => api.post('/auth/user/register', userData).then((r) => r.data)),

  restaurantLogin: (credentials) =>
    wrap(() => api.post('/auth/restaurant/login', credentials).then((r) => r.data)),

  restaurantRegister: (restaurantData) =>
    wrap(() => api.post('/auth/restaurant/register', restaurantData).then((r) => r.data)),

  googleLogin: (credential) =>
    wrap(() => api.post('/auth/google', { credential }).then((r) => r.data)),
};

export const orderAPI = {
  placeOrder: (cart, payment) =>
    wrap(() => api.post('/orders/place', { cart, payment }).then((r) => r.data)),

  pay: (orderId, paymentData) =>
    wrap(() => api.post(`/orders/${orderId}/payment`, paymentData).then((r) => r.data)),

  getById: (orderId) =>
    wrap(() => api.get(`/orders/${orderId}`).then((r) => r.data)),

  getTracking: (orderId) =>
    wrap(() => api.get(`/orders/${orderId}/tracking`).then((r) => r.data)),

  cancel: (orderId) =>
    wrap(() => api.post(`/orders/${orderId}/cancel`, {}).then((r) => r.data)),

  accept: (orderId) =>
    wrap(() => api.post(`/orders/${orderId}/accept`, {}).then((r) => r.data)),

  reject: (orderId) =>
    wrap(() => api.post(`/orders/${orderId}/reject`, {}).then((r) => r.data)),

  startPreparing: (orderId) =>
    wrap(() => api.post(`/orders/${orderId}/prepare`, {}).then((r) => r.data)),

  markReady: (orderId) =>
    wrap(() => api.post(`/orders/${orderId}/ready`, {}).then((r) => r.data)),

  getUserOrders: (userId) =>
    wrap(() => api.get(`/orders/user/${userId}`).then((r) => r.data)),

  getRestaurantOrders: (restaurantId) =>
    wrap(() => api.get(`/orders/restaurant/${restaurantId}`).then((r) => r.data)),

  updateStatus: (orderId, status) =>
    wrap(() => api.patch(`/orders/${orderId}/status`, { status }).then((r) => r.data)),
};

export const foodclubAPI = {
  discover: (params) =>
    wrap(() => api.get('/v1/discover', { params }).then((r) => r.data)),

  getHomeFeed: (params) =>
    wrap(() => api.get('/v1/home', { params }).then((r) => r.data)),

  getBenefits: () =>
    wrap(() => api.get('/v1/select/benefits').then((r) => r.data)),

  getSelectRestaurants: (lat, lng, radius = 15) =>
    wrap(() => api.get('/v1/select/restaurants', { params: { lat, lng, radius } }).then((r) => r.data)),

  getMembership: () =>
    wrap(() => api.get('/v1/select').then((r) => r.data)),

  subscribe: (payment) =>
    wrap(() => api.post('/v1/select/subscribe', payment).then((r) => r.data)),

  cancelMembership: () =>
    wrap(() => api.post('/v1/select/cancel', {}).then((r) => r.data)),

  getPreferences: () =>
    wrap(() => api.get('/v1/me/preferences').then((r) => r.data)),

  updatePreferences: (data) =>
    wrap(() => api.put('/v1/me/preferences', data).then((r) => r.data)),

  getNotifications: () =>
    wrap(() => api.get('/v1/me/notifications').then((r) => r.data)),
};

export const adminAPI = {
  login: (credentials) =>
    wrap(() => api.post('/auth/admin/login', credentials).then((r) => r.data)),

  listPending: () =>
    wrap(() => api.get('/v1/admin/restaurants/pending').then((r) => r.data)),

  verify: (id, reviewNotes) =>
    wrap(() => api.post(`/v1/admin/restaurants/${id}/verify`, { reviewNotes }).then((r) => r.data)),

  reject: (id, reviewNotes) =>
    wrap(() => api.post(`/v1/admin/restaurants/${id}/reject`, { reviewNotes }).then((r) => r.data)),
};

export const feedbackAPI = {
  create: (payload) =>
    wrap(() => api.post('/feedback', payload).then((r) => r.data)),

  getForOrder: (orderId) =>
    wrap(() => api.get(`/feedback/order/${orderId}`).then((r) => r.data)),
};

export const supportAPI = {
  create: (payload) =>
    wrap(() => api.post('/support', payload).then((r) => r.data)),
};
