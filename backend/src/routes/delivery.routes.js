const express = require('express');
const deliveryController = require('../controllers/deliveryController');
const { authenticateDeliveryPartner } = require('../middleware/auth');
const { assertAuthenticatedPartner, authorizeAssignedDelivery } = require('../middleware/deliveryAuth');

const router = express.Router();

router.get('/partners', deliveryController.listAvailable);

router.use(authenticateDeliveryPartner);

router.patch('/partners/availability', assertAuthenticatedPartner, deliveryController.setAvailability);
router.patch('/partners/location', assertAuthenticatedPartner, deliveryController.updateLocation);
router.post('/pickup', assertAuthenticatedPartner, authorizeAssignedDelivery, deliveryController.pickUp);
router.post('/complete', assertAuthenticatedPartner, authorizeAssignedDelivery, deliveryController.completeDelivery);

module.exports = router;
