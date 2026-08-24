/** Strategy Pattern — payment methods (LLD section 17). */
class PaymentStrategy {
  /** @returns {Promise<{ success: boolean, transactionId: string, message?: string }>} */
  // eslint-disable-next-line class-methods-use-this, no-unused-vars
  async pay(orderId, money, request) {
    throw new Error('pay() must be implemented');
  }
}

module.exports = PaymentStrategy;
