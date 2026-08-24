const express = require('express');
const orderController = require('../controllers/orderController');
const { authenticateUser, authenticateRestaurant } = require('../middleware/auth');
const {
  authorizeUserOrders,
  authorizeRestaurantOrders,
  loadOrder,
  authorizeCustomerOrderOwner,
  authorizeRestaurantOrderOwner,
  authorizeOrderParticipant,
  assertOrderForAuthenticatedUser,
} = require('../middleware/orderAuth');

const router = express.Router();

router.post('/', authenticateUser, assertOrderForAuthenticatedUser, orderController.create);
router.post('/place', authenticateUser, assertOrderForAuthenticatedUser, orderController.placeOrder);

router.get('/user/:userId', authenticateUser, authorizeUserOrders, orderController.listForUser);
router.get(
  '/restaurant/:restaurantId',
  authenticateRestaurant,
  authorizeRestaurantOrders,
  orderController.listForRestaurant
);

router.get('/:id/tracking', loadOrder, authorizeOrderParticipant, orderController.getTracking);
router.get('/:id', loadOrder, authorizeOrderParticipant, orderController.getById);

router.post('/:id/payment', authenticateUser, loadOrder, authorizeCustomerOrderOwner, orderController.pay);
router.post('/:id/cancel', loadOrder, authorizeOrderParticipant, orderController.cancel);

router.post('/:id/accept', authenticateRestaurant, loadOrder, authorizeRestaurantOrderOwner, orderController.accept);
router.post('/:id/reject', authenticateRestaurant, loadOrder, authorizeRestaurantOrderOwner, orderController.reject);
router.post('/:id/prepare', authenticateRestaurant, loadOrder, authorizeRestaurantOrderOwner, orderController.startPreparing);
router.post('/:id/ready', authenticateRestaurant, loadOrder, authorizeRestaurantOrderOwner, orderController.markReady);

router.patch('/:id/status', authenticateRestaurant, loadOrder, authorizeRestaurantOrderOwner, orderController.updateStatus);

module.exports = router;
