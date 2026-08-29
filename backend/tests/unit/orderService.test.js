jest.mock('../../src/repositories/orderRepository');
jest.mock('../../src/repositories/restaurantRepository');
jest.mock('../../src/services/membershipService', () => ({
  isSelectMember: jest.fn().mockResolvedValue(false),
}));
jest.mock('../../src/services/deliveryService', () => ({
  assignDelivery: jest.fn(),
  startLiveTracking: jest.fn(),
}));
jest.mock('../../src/services/socketService', () => ({
  stopDriverSimulation: jest.fn(),
}));
jest.mock('../../src/events/EventPublisher', () => ({
  eventPublisher: {
    subscribe: jest.fn(),
    publish: jest.fn().mockResolvedValue(undefined),
  },
}));

const orderRepository = require('../../src/repositories/orderRepository');
const restaurantRepository = require('../../src/repositories/restaurantRepository');
const orderService = require('../../src/services/orderService');
const { OrderStatus } = require('../../src/domain/enums');

const MENU_ITEM_ID = '11111111-1111-1111-1111-111111111111';

function fakeOrderRecord(overrides = {}) {
  return {
    row: {
      id: 'order-1',
      user_id: 'user-1',
      restaurant_id: 'restaurant-1',
      total_amount: '439.00',
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

function mockActiveRestaurant() {
  restaurantRepository.findById.mockResolvedValue({
    id: 'restaurant-1',
    is_active: true,
    latitude: null,
    longitude: null,
  });
}

function mockMenuItem(overrides = {}) {
  restaurantRepository.findMenuItemsByIds.mockResolvedValue(new Map([
    [MENU_ITEM_ID, {
      id: MENU_ITEM_ID,
      restaurant_id: 'restaurant-1',
      name: 'Margherita Pizza',
      price: '380.00',
      available: true,
      calories: null,
      protein_g: null,
      carbs_g: null,
      fat_g: null,
      sugar_g: null,
      fiber_g: null,
      dietary_tags: [],
      allergens: [],
      ...overrides,
    }],
  ]));
}

beforeEach(() => {
  jest.resetAllMocks();
});

describe('orderService.updateStatus - state machine', () => {
  test('allows payment_pending → confirmed', async () => {
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

  test('allows confirmed → restaurant_accepted → preparing', async () => {
    orderRepository.findById
      .mockResolvedValueOnce(fakeOrderRecord({ status: OrderStatus.CONFIRMED }))
      .mockResolvedValueOnce(fakeOrderRecord({ status: OrderStatus.RESTAURANT_ACCEPTED }));
    orderRepository.updateStatus.mockResolvedValueOnce({ id: 'order-1', status: OrderStatus.RESTAURANT_ACCEPTED });

    const accepted = await orderService.updateStatus('order-1', OrderStatus.RESTAURANT_ACCEPTED);
    expect(accepted.status).toBe(OrderStatus.RESTAURANT_ACCEPTED);

    orderRepository.findById
      .mockResolvedValueOnce(fakeOrderRecord({ status: OrderStatus.RESTAURANT_ACCEPTED }))
      .mockResolvedValueOnce(fakeOrderRecord({ status: OrderStatus.PREPARING }));
    orderRepository.updateStatus.mockResolvedValueOnce({ id: 'order-1', status: OrderStatus.PREPARING });

    const preparing = await orderService.updateStatus('order-1', OrderStatus.PREPARING);
    expect(preparing.status).toBe(OrderStatus.PREPARING);
  });

  test('409s when skipping restaurant_accepted (confirmed → preparing)', async () => {
    orderRepository.findById.mockResolvedValueOnce(
      fakeOrderRecord({ status: OrderStatus.CONFIRMED })
    );

    await expect(orderService.updateStatus('order-1', OrderStatus.PREPARING)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(orderRepository.updateStatus).not.toHaveBeenCalled();
  });

  test('409s on payment_pending → delivered', async () => {
    orderRepository.findById.mockResolvedValueOnce(
      fakeOrderRecord({ status: OrderStatus.PAYMENT_PENDING })
    );

    await expect(orderService.updateStatus('order-1', OrderStatus.DELIVERED)).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(orderRepository.updateStatus).not.toHaveBeenCalled();
  });

  test('409s out of terminal delivered state', async () => {
    orderRepository.findById.mockResolvedValueOnce(fakeOrderRecord({ status: OrderStatus.DELIVERED }));

    await expect(orderService.updateStatus('order-1', OrderStatus.CANCELLED)).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  test('400s on unknown status before DB access', async () => {
    await expect(orderService.updateStatus('order-1', 'teleported')).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(orderRepository.findById).not.toHaveBeenCalled();
  });

  test('404s when order missing', async () => {
    orderRepository.findById.mockResolvedValueOnce(null);

    await expect(orderService.updateStatus('missing-id', OrderStatus.CONFIRMED)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  test('409s on concurrent update race', async () => {
    orderRepository.findById.mockResolvedValueOnce(
      fakeOrderRecord({ status: OrderStatus.PAYMENT_PENDING })
    );
    orderRepository.updateStatus.mockResolvedValueOnce(null);

    await expect(orderService.updateStatus('order-1', OrderStatus.CONFIRMED)).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  test('transition table matches migration 003 lifecycle', () => {
    const { TRANSITIONS } = orderService;
    expect(TRANSITIONS.created).toEqual(
      expect.arrayContaining([OrderStatus.PAYMENT_PENDING, OrderStatus.CANCELLED])
    );
    expect(TRANSITIONS.payment_pending).toEqual(
      expect.arrayContaining([OrderStatus.CONFIRMED, OrderStatus.CANCELLED])
    );
    expect(TRANSITIONS.confirmed).toEqual(
      expect.arrayContaining([OrderStatus.RESTAURANT_ACCEPTED, OrderStatus.CANCELLED])
    );
    expect(TRANSITIONS.restaurant_accepted).toEqual(
      expect.arrayContaining([OrderStatus.PREPARING, OrderStatus.CANCELLED])
    );
    expect(TRANSITIONS.preparing).toEqual(
      expect.arrayContaining([OrderStatus.READY_FOR_PICKUP, OrderStatus.CANCELLED])
    );
    expect(TRANSITIONS.ready_for_pickup).toEqual([OrderStatus.OUT_FOR_DELIVERY]);
    expect(TRANSITIONS.out_for_delivery).toEqual([OrderStatus.DELIVERED]);
    expect(TRANSITIONS.delivered).toEqual([]);
    expect(TRANSITIONS.cancelled).toEqual([]);
  });
});

describe('orderService.create - input validation', () => {
  test('rejects an order with no items', async () => {
    await expect(
      orderService.create({ user: 'u1', restaurant: 'r1', items: [] })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('rejects cart lines without menuItem id', async () => {
    mockActiveRestaurant();
    await expect(
      orderService.create({
        user: 'u1',
        restaurant: 'restaurant-1',
        items: [{ name: 'x', price: 1, quantity: 1 }],
      })
    ).rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/menu item/i) });
  });

  test('rejects menu items from another restaurant', async () => {
    mockActiveRestaurant();
    mockMenuItem({ restaurant_id: 'other-restaurant' });

    await expect(
      orderService.create({
        user: 'u1',
        restaurant: 'restaurant-1',
        items: [{ menuItem: MENU_ITEM_ID, quantity: 1 }],
      })
    ).rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/does not belong/i) });
  });

  test('rejects unavailable menu items', async () => {
    mockActiveRestaurant();
    mockMenuItem({ available: false });

    await expect(
      orderService.create({
        user: 'u1',
        restaurant: 'restaurant-1',
        items: [{ menuItem: MENU_ITEM_ID, quantity: 1 }],
      })
    ).rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/not available/i) });
  });

  test('rejects an order missing user or restaurant', async () => {
    await expect(
      orderService.create({
        restaurant: 'restaurant-1',
        items: [{ menuItem: MENU_ITEM_ID, quantity: 1 }],
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('prices from DB even when client sends a tampered price', async () => {
    mockActiveRestaurant();
    mockMenuItem();
    orderRepository.createWithItems.mockResolvedValueOnce({
      row: { id: 'order-1', status: OrderStatus.CREATED },
      items: [],
    });
    orderRepository.findById
      .mockResolvedValueOnce(fakeOrderRecord({ status: OrderStatus.CREATED }))
      .mockResolvedValueOnce(fakeOrderRecord({ status: OrderStatus.PAYMENT_PENDING }))
      .mockResolvedValueOnce(fakeOrderRecord({ status: OrderStatus.PAYMENT_PENDING }));
    orderRepository.updateStatus.mockResolvedValueOnce({ id: 'order-1', status: OrderStatus.PAYMENT_PENDING });

    await orderService.create({
      user: 'u1',
      restaurant: 'restaurant-1',
      items: [{ menuItem: MENU_ITEM_ID, name: 'Fake', price: 1, quantity: 1 }],
    });

    expect(orderRepository.createWithItems).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [expect.objectContaining({ price: 380, name: 'Margherita Pizza' })],
        totalAmount: 439,
      })
    );
  });
});
