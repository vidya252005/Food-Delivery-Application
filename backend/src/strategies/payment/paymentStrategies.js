const PaymentStrategy = require('./PaymentStrategy');

class CardPaymentStrategy extends PaymentStrategy {
  async pay(orderId, money, request) {
    await simulateProviderDelay();
    const last4 = request?.cardNumber?.slice(-4) || '****';
    return {
      success: true,
      transactionId: `card_${orderId.slice(0, 8)}_${Date.now()}`,
      message: `Card ending ${last4} charged ₹${money.toRupees()}`,
    };
  }
}

class UPIPaymentStrategy extends PaymentStrategy {
  async pay(orderId, money, request) {
    await simulateProviderDelay();
    return {
      success: true,
      transactionId: `upi_${orderId.slice(0, 8)}_${Date.now()}`,
      message: `UPI ${request?.upiId || 'payment'} confirmed ₹${money.toRupees()}`,
    };
  }
}

class WalletPaymentStrategy extends PaymentStrategy {
  async pay(orderId, money) {
    await simulateProviderDelay();
    return {
      success: true,
      transactionId: `wallet_${orderId.slice(0, 8)}_${Date.now()}`,
      message: `Wallet debited ₹${money.toRupees()}`,
    };
  }
}

class CODPaymentStrategy extends PaymentStrategy {
  async pay(orderId) {
    return {
      success: true,
      transactionId: `cod_${orderId.slice(0, 8)}`,
      message: 'Cash on delivery — pay when order arrives',
    };
  }
}

function simulateProviderDelay() {
  return new Promise((r) => setTimeout(r, 300));
}

module.exports = {
  CardPaymentStrategy,
  UPIPaymentStrategy,
  WalletPaymentStrategy,
  CODPaymentStrategy,
};
