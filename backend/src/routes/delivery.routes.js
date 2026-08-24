const express = require('express');
const deliveryController = require('../controllers/deliveryController');

const router = express.Router();

router.get('/partners', deliveryController.listAvailable);
router.patch('/partners/availability', deliveryController.setAvailability);
router.patch('/partners/location', deliveryController.updateLocation);
router.post('/pickup', deliveryController.pickUp);
router.post('/complete', deliveryController.completeDelivery);

module.exports = router;
