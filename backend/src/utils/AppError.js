/** Operational error with an HTTP status attached, thrown by services and turned into a response by errorHandler. */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode; // kept for compatibility with the original error handler's `err.status` read
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
