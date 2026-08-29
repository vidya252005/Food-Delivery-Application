const deliveryRepository = require('../repositories/deliveryRepository');
const AppError = require('../utils/AppError');

/** Mutating delivery routes must act as the authenticated partner, not body.partnerId. */
function assertAuthenticatedPartner(req, res, next) {
  if (req.body?.partnerId && req.body.partnerId !== req.partnerId) {
    return res.status(403).json({ message: 'Forbidden — cannot act on behalf of another delivery partner' });
  }
  return next();
}

/** Pickup/complete — delivery must be assigned to the authenticated partner. */
async function authorizeAssignedDelivery(req, res, next) {
  const orderId = req.body?.orderId;
  if (!orderId) throw new AppError('orderId is required', 400);

  const delivery = await deliveryRepository.findByOrderId(orderId);
  if (!delivery || delivery.partner_id !== req.partnerId) {
    return res.status(403).json({ message: 'Forbidden — this delivery is not assigned to you' });
  }

  req.deliveryRecord = delivery;
  return next();
}

module.exports = { assertAuthenticatedPartner, authorizeAssignedDelivery };
