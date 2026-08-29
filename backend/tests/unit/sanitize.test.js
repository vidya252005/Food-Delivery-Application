const {
  sanitizeForLog,
  pickPaymentRequest,
  pickCartItems,
} = require('../../src/utils/sanitize');

describe('sanitize utilities', () => {
  test('sanitizeForLog redacts passwords and tokens', () => {
    const sanitized = sanitizeForLog({
      email: 'a@example.com',
      password: 'secret123',
      authorization: 'Bearer abc.def.ghi',
      nested: { cardNumber: '4111111111111111' },
    });
    expect(sanitized.password).toBe('[REDACTED]');
    expect(sanitized.authorization).toBe('[REDACTED]');
    expect(sanitized.nested.cardNumber).toBe('[REDACTED]');
    expect(sanitized.email).toBe('a@example.com');
  });

  test('pickPaymentRequest whitelists payment fields only', () => {
    expect(pickPaymentRequest({
      method: 'card',
      idempotencyKey: 'k1',
      cardNumber: '4111 1111 1111 1111',
      amount: 1,
      cvv: '123',
    })).toEqual({
      method: 'card',
      idempotencyKey: 'k1',
      cardNumber: '4111111111111111',
    });
  });

  test('pickCartItems strips client price and name', () => {
    expect(pickCartItems([
      { menuItem: 'abc', quantity: 2, price: 1, name: 'Cheap item' },
    ])).toEqual([{ menuItem: 'abc', quantity: 2 }]);
  });
});
