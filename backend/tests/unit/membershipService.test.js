const membershipService = require('../../src/services/membershipService');

jest.mock('../../src/repositories/membershipRepository', () => ({
  findActiveByUserId: jest.fn(),
  subscribe: jest.fn().mockResolvedValue({
    id: 'mem-1',
    tier: 'select',
    status: 'active',
    start_date: new Date(),
    expiry_date: new Date(Date.now() + 30 * 86400000),
  }),
  cancel: jest.fn(),
  isSelectMember: jest.fn(),
}));

jest.mock('../../src/repositories/paymentRepository', () => ({
  findByIdempotencyKey: jest.fn().mockResolvedValue(null),
  create: jest.fn().mockResolvedValue({ id: 'pay-1' }),
  updateStatus: jest.fn().mockResolvedValue({ id: 'pay-1', status: 'success' }),
}));

jest.mock('../../src/strategies/payment/PaymentStrategyFactory', () => ({
  getPaymentStrategy: () => ({
    pay: jest.fn().mockResolvedValue({
      success: true,
      transactionId: 'txn-select-1',
      message: 'ok',
    }),
  }),
}));

const paymentRepository = require('../../src/repositories/paymentRepository');
const membershipRepository = require('../../src/repositories/membershipRepository');

describe('membershipService.subscribe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('requires payment method and idempotencyKey', async () => {
    await expect(membershipService.subscribe('user-1', {})).rejects.toMatchObject({
      message: 'Payment method and idempotencyKey are required',
      statusCode: 400,
    });
    expect(membershipRepository.subscribe).not.toHaveBeenCalled();
  });

  test('rejects COD for membership', async () => {
    await expect(
      membershipService.subscribe('user-1', { method: 'cod', idempotencyKey: 'idem-1' })
    ).rejects.toMatchObject({
      message: 'Select membership cannot be paid with cash on delivery',
      statusCode: 400,
    });
  });

  test('charges payment then activates select membership', async () => {
    const result = await membershipService.subscribe('user-1', {
      method: 'card',
      idempotencyKey: 'select-idem-1',
      cardNumber: '4111111111111111',
    });

    expect(paymentRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: null,
        amountPaise: 9900,
        method: 'card',
        idempotencyKey: 'select-idem-1',
      })
    );
    expect(membershipRepository.subscribe).toHaveBeenCalledWith('user-1', 'select');
    expect(result.tier).toBe('select');
    expect(result.active).toBe(true);
  });
});
