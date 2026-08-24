// Authenticated restaurant self-service - every route requires a valid
// restaurant JWT. Mounted at /api/restaurant.
const express = require('express');
const restaurantController = require('../controllers/restaurantController');
const { authenticateRestaurant } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateRestaurant);

router.get('/menu', restaurantController.getOwnMenu);
router.post('/menu', restaurantController.addMenuItem);
router.put('/menu/:menuItemId', restaurantController.updateMenuItem);
router.delete('/menu/:menuItemId', restaurantController.deleteMenuItem);

router.get('/stats', restaurantController.getStats);
router.get('/orders', restaurantController.getOwnOrders);
router.get('/profile', restaurantController.getOwnProfile);
router.put('/profile', restaurantController.updateProfile);
router.get('/verification', restaurantController.getVerificationStatus);
router.post('/verification', restaurantController.submitVerification);

module.exports = router;
