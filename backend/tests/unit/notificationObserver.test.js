jest.mock('../../src/services/notificationService', () => ({
  create: jest.fn().mockResolvedValue(undefined),
}));

const notificationService = require('../../src/services/notificationService');
const NotificationObserver = require('../../src/events/observers/NotificationObserver');
const { OrderStatus } = require('../../src/domain/enums');

const observer = new NotificationObserver();

const baseOrder = {
  id: 'order-1',
  user: { id: 'user-1' },
  restaurant: { name: 'EatFit' },
};

beforeEach(() => {
  jest.resetAllMocks();
});

describe('NotificationObserver', () => {
  test('ignores non order.status_changed events', async () => {
    await observer.handle({ type: 'other.event', payload: {} });
    expect(notificationService.create).not.toHaveBeenCalled();
  });

  test('sends one notification per transition', async () => {
    await observer.handle({
      type: 'order.status_changed',
      payload: { order: baseOrder, previousStatus: 'confirmed', newStatus: OrderStatus.RESTAURANT_ACCEPTED },
    });

    expect(notificationService.create).toHaveBeenCalledTimes(1);
    expect(notificationService.create).toHaveBeenCalledWith({
      userId: 'user-1',
      orderId: 'order-1',
      title: 'Restaurant Accepted',
      body: 'EatFit is preparing your food',
    });
  });

  test('uses specific copy for out_for_delivery, not a generic duplicate', async () => {
    await observer.handle({
      type: 'order.status_changed',
      payload: { order: baseOrder, previousStatus: 'ready_for_pickup', newStatus: OrderStatus.OUT_FOR_DELIVERY },
    });

    expect(notificationService.create).toHaveBeenCalledTimes(1);
    expect(notificationService.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'On the way!' })
    );
  });

  test('falls back to generic order update for unmapped statuses', async () => {
    await observer.handle({
      type: 'order.status_changed',
      payload: { order: baseOrder, previousStatus: 'restaurant_accepted', newStatus: OrderStatus.PREPARING },
    });

    expect(notificationService.create).toHaveBeenCalledTimes(1);
    expect(notificationService.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Order Update', body: 'Your order is now: Preparing' })
    );
  });
});
