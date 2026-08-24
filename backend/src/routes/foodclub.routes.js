const express = require('express');
const foodclubController = require('../controllers/foodclubController');
const { authenticateUser } = require('../middleware/auth');

const router = express.Router();

router.get('/discover', foodclubController.discover);
router.get('/home', foodclubController.getHomeFeed);

router.get('/select/benefits', foodclubController.getBenefits);
router.get('/select/restaurants', foodclubController.listSelectRestaurants);
router.get('/select', authenticateUser, foodclubController.getMembership);
router.post('/select/subscribe', authenticateUser, foodclubController.subscribe);
router.post('/select/cancel', authenticateUser, foodclubController.cancelMembership);

router.get('/me/preferences', authenticateUser, foodclubController.getPreferences);
router.put('/me/preferences', authenticateUser, foodclubController.updatePreferences);
router.get('/me/notifications', authenticateUser, foodclubController.getNotifications);

module.exports = router;
