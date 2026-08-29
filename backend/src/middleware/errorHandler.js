const { sanitizeForLog } = require('../utils/sanitize');

/**
 * Maps a handful of common Postgres error codes to a client-safe message
 * and status, so a constraint violation doesn't leak as a raw 500 with
 * the driver's internal wording. Anything not listed here still falls
 * through to a generic 500 - this is deliberately a narrow allow-list,
 * not an attempt to explain every possible Postgres error to the client.
 * https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
const PG_ERROR_MAP = {
  '23505': { status: 409, message: 'A record with that value already exists.' }, // unique_violation
  '23503': { status: 400, message: 'Referenced record does not exist.' }, // foreign_key_violation
  '23514': { status: 400, message: 'Value does not satisfy a required constraint.' }, // check_violation
  '22P02': { status: 400, message: 'Invalid input format.' }, // invalid_text_representation (e.g. bad UUID)
};

// 4-arg signature is required for Express to recognize this as error-handling
// middleware, even though `next` itself is never called - config's
// no-unused-vars argsIgnorePattern already exempts args named "next".
function errorHandler(err, req, res, next) {
  if (err.code && PG_ERROR_MAP[err.code]) {
    const mapped = PG_ERROR_MAP[err.code];
    return res.status(mapped.status).json({ error: mapped.message, path: req.path });
  }

  const status = err.statusCode || err.status || 500;
  if (status >= 500) {
    console.error('Error:', err.message, sanitizeForLog({ path: req.path, method: req.method }));
  } else {
    console.error('Error:', err.message);
  }

  res.status(status).json({
    error: err.message || 'Internal Server Error',
    path: req.path,
  });
}

module.exports = errorHandler;
