/**
 * In-process sliding-window rate limiter (per IP + route prefix).
 * Not Redis-backed — suitable for single-instance dev/demo deployments.
 */

const buckets = new Map();

function rateLimit({ windowMs = 60_000, max = 120, keyPrefix = '' } = {}) {
  return (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || now - bucket.start >= windowMs) {
      bucket = { start: now, count: 0 };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > max) {
      return res.status(429).json({ message: 'Too many requests — please try again shortly' });
    }
    return next();
  };
}

const authRateLimit = rateLimit({ windowMs: 60_000, max: 30, keyPrefix: 'auth' });
const apiRateLimit = rateLimit({ windowMs: 60_000, max: 300, keyPrefix: 'api' });

module.exports = { rateLimit, authRateLimit, apiRateLimit };
