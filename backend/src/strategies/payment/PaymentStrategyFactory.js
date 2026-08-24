const { PaymentMethod } = require('../../domain/enums');
const {
  CardPaymentStrategy,
  UPIPaymentStrategy,
  WalletPaymentStrategy,
  CODPaymentStrategy,
} = require('./paymentStrategies');
const AppError = require('../../utils/AppError');

/** Factory Pattern — creates payment strategy from method (LLD section 43). */
function getPaymentStrategy(method) {
  switch (method) {
    case PaymentMethod.CARD:
      return new CardPaymentStrategy();
    case PaymentMethod.UPI:
      return new UPIPaymentStrategy();
    case PaymentMethod.WALLET:
      return new WalletPaymentStrategy();
    case PaymentMethod.COD:
      return new CODPaymentStrategy();
    default:
      throw new AppError(`Unsupported payment method: ${method}`, 400);
  }
}

module.exports = { getPaymentStrategy };
