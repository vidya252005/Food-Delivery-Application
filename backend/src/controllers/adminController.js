const adminService = require('../services/adminService');
const asyncHandler = require('../utils/asyncHandler');

const listPending = asyncHandler(async (req, res) => {
  res.json(await adminService.listPendingRestaurants());
});

const verify = asyncHandler(async (req, res) => {
  const result = await adminService.verifyRestaurant(
    req.params.id,
    req.userId,
    req.body.reviewNotes
  );
  res.json({ message: 'Restaurant verified', restaurant: result });
});

const reject = asyncHandler(async (req, res) => {
  const result = await adminService.rejectRestaurant(
    req.params.id,
    req.userId,
    req.body.reviewNotes
  );
  res.json({ message: 'Restaurant rejected', restaurant: result });
});

module.exports = { listPending, verify, reject };
