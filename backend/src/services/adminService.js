const verificationService = require('./verificationService');

async function listPendingRestaurants() {
  return verificationService.listPendingForAdmin();
}

async function verifyRestaurant(restaurantId, adminUserId, reviewNotes) {
  return verificationService.approveWithRequest(restaurantId, adminUserId, reviewNotes);
}

async function rejectRestaurant(restaurantId, adminUserId, reviewNotes) {
  return verificationService.rejectWithRequest(restaurantId, adminUserId, reviewNotes);
}

module.exports = { listPendingRestaurants, verifyRestaurant, rejectRestaurant };
