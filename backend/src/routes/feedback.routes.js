const express = require('express');
const feedbackController = require('../controllers/feedbackController');

const router = express.Router();

router.post('/', feedbackController.create);
router.get('/order/:orderId', feedbackController.getForOrder);
router.get('/restaurant/:restaurantId', feedbackController.getForRestaurant);

module.exports = router;
