/**
 * Wraps an async Express handler so a rejected promise is forwarded to
 * next(err) instead of becoming an unhandled rejection. Every controller
 * below is wrapped in this instead of repeating try/catch per route.
 */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = asyncHandler;
