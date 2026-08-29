const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'password_hash',
  'confirmpassword',
  'confirm_password',
  'token',
  'authorization',
  'credential',
  'cardnumber',
  'card_number',
  'cvv',
  'cvc',
  'secret',
  'apikey',
  'api_key',
]);

function redactValue(key, value) {
  if (value == null) return value;
  const normalized = String(key).toLowerCase();
  if (SENSITIVE_KEYS.has(normalized)) return '[REDACTED]';
  if (normalized.includes('password') || normalized.includes('token')) return '[REDACTED]';
  if (typeof value === 'string' && /^Bearer\s+/i.test(value)) return 'Bearer [REDACTED]';
  return value;
}

/** Deep-clone an object for logs, redacting secrets and payment data. */
function sanitizeForLog(input, depth = 0) {
  if (input == null || depth > 4) return input;
  if (Array.isArray(input)) {
    return input.map((entry) => sanitizeForLog(entry, depth + 1));
  }
  if (typeof input !== 'object') return input;

  const out = {};
  for (const [key, value] of Object.entries(input)) {
    if (value != null && typeof value === 'object') {
      out[key] = sanitizeForLog(value, depth + 1);
    } else {
      out[key] = redactValue(key, value);
    }
  }
  return out;
}

/** Whitelist payment fields accepted from HTTP clients. */
function pickPaymentRequest(body = {}) {
  const payload = {
    method: body.method,
    idempotencyKey: body.idempotencyKey,
  };
  if (body.upiId) payload.upiId = body.upiId;
  if (body.cardNumber) payload.cardNumber = String(body.cardNumber).replace(/\s/g, '');
  return payload;
}

/** Strip client-supplied pricing/name fields from cart lines. */
function pickCartItems(items = []) {
  return items.map((item) => ({
    menuItem: item.menuItem,
    quantity: item.quantity,
  }));
}

module.exports = {
  sanitizeForLog,
  pickPaymentRequest,
  pickCartItems,
};
