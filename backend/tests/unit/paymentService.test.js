const { pay } = require('../../src/services/paymentService');

jest.mock('../../src/repositories/paymentRepository', () => ({
  findByIdempotencyKey: jest.fn().mockResolvedValue(null),
  create: jest.fn().mockResolvedValue({ id: 'pay-1' }),
  updateStatus: jest.fn().mockResolvedValue({ id: 'pay-1', status: 'success' }),
}));

jest.mock('../../src/strategies/payment/PaymentStrategyFactory', () => ({
  getPaymentStrategy: () => ({
    pay: jest.fn().mockResolvedValue({
      success: true,
      transactionId: 'txn-1',
      message: 'ok',
    }),
  }),
}));

const paymentRepository = require('../../src/repositories/paymentRepository');

describe('paymentService.pay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects client-supplied amount that does not match order total', async () => {
    await expect(pay('order-1', 439, {
      method: 'cod',
      idempotencyKey: 'idem-1',
      amount: 1,
    })).rejects.toMatchObject({ message: 'Payment amount does not match order total', statusCode: 400 });
    expect(paymentRepository.create).not.toHaveBeenCalled();
  });
});
