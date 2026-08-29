const SENSITIVE_PATH_PREFIXES = ['/api/auth', '/api/orders', '/api/v1/admin'];

function shouldRedactPath(path) {
  return SENSITIVE_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function requestLogger(req, res, next) {
  const path = req.originalUrl.split('?')[0];
  const tag = shouldRedactPath(path) ? '[auth]' : '';
  console.log(`${tag}[${new Date().toISOString()}] ${req.method} ${path}`.trim());
  next();
}

module.exports = requestLogger;
