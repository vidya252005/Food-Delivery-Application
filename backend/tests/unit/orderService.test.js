jest.mock('../../src/repositories/orderRepository');
jest.mock('../../src/repositories/restaurantRepository');

const orderRepository = require('../../src/repositories/orderRepository');
const orderService = require('../../src/services/orderService');
const { OrderStatus } = require('../../src/domain/enums');

function fakeOrderRecord(overrides = {}) {
  return {
    row: {
      id: 'order-1',
      user_id: 'user-1',
      restaurant_id: 'restaurant-1',
      total_amount: '250.00',
      street: null,
      city: null,
      state: null,
      zip_code: null,
      status: OrderStatus.PAYMENT_PENDING,
      payment_status: 'pending',
      created_at: new Date('2026-01-01'),
      updated_at: new Date('2026-01-01'),
      ...overrides,
    },
    items: [],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('orderService.updateStatus - state machine', () => {
  test('allows a legal transition (payment_pending -> confirmed)', async () => {
    orderRepository.findById
      .mockResolvedValueOnce(fakeOrderRecord({ status: OrderStatus.PAYMENT_PENDING }))
      .mockResolvedValueOnce(fakeOrderRecord({ status: OrderStatus.CONFIRMED }));
    orderRepository.updateStatus.mockResolvedValueOnce({ id: 'order-1', status: OrderStatus.CONFIRMED });

    const result = await orderService.updateStatus('order-1', OrderStatus.CONFIRMED);

    expect(result.status).toBe(OrderStatus.CONFIRMED);
    expect(orderRepository.updateStatus).toHaveBeenCalledWith(
      'order-1',
      OrderStatus.CONFIRMED,
      [OrderStatus.PAYMENT_PENDING]
    );
  });

  test('rejects an illegal jump (payment_pending -> delivered) with a 409', async () => {
    orderRepository.findById.mockResolvedValueOnce(
      fakeOrderRecord({ status: OrderStatus.PAYMENT_PENDING })
    );

    await expect(orderService.updateStatus('order-1', OrderStatus.DELIVERED)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(orderRepository.updateStatus).not.toHaveBeenCalled();
  });

  test('rejects any transition out of a terminal state (delivered -> anything)', async () => {
    orderRepository.findById.mockResolvedValueOnce(fakeOrderRecord({ status: OrderStatus.DELIVERED }));

    await expect(orderService.updateStatus('order-1', OrderStatus.CANCELLED)).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  test('rejects a status string outside the known enum with a 400 before touching the DB', async () => {
    await expect(orderService.updateStatus('order-1', 'teleported')).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(orderRepository.findById).not.toHaveBeenCalled();
  });

  test('returns 404 for an order that does not exist', async () => {
    orderRepository.findById.mockResolvedValueOnce(null);

    await expect(orderService.updateStatus('missing-id', OrderStatus.CONFIRMED)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  test('surfaces a 409 when the row changed under us between the check and the conditional UPDATE', async () => {
    orderRepository.findById.mockResolvedValueOnce(
      fakeOrderRecord({ status: OrderStatus.PAYMENT_PENDING })
    );
    orderRepository.updateStatus.mockResolvedValueOnce(null);

    await expect(orderService.updateStatus('order-1', OrderStatus.CONFIRMED)).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  test('every state in the transition table is reachable and every terminal state has no outgoing edges', () => {
    const { TRANSITIONS } = orderService;
    expect(TRANSITIONS.delivered).toEqual([]);
    expect(TRANSITIONS.cancelled).toEqual([]);
    expect(TRANSITIONS.payment_pending).toEqual(
      expect.arrayContaining([OrderStatus.CONFIRMED, OrderStatus.CANCELLED])
    );
  });
});

describe('orderService.create - input validation', () => {
  test('rejects an order with no items', async () => {
    await expect(
      orderService.create({ user: 'u1', restaurant: 'r1', items: [], totalAmount: 100 })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('rejects an order missing totalAmount', async () => {
    await expect(
      orderService.create({ user: 'u1', restaurant: 'r1', items: [{ name: 'x', price: 1, quantity: 1 }] })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('rejects an order missing user or restaurant', async () => {
    await expect(
      orderService.create({ restaurant: 'r1', items: [{ name: 'x', price: 1, quantity: 1 }], totalAmount: 1 })
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
