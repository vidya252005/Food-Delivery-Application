const jwt = require('jsonwebtoken');
const env = require('../../src/config/env');

function bearerToken(id, role) {
  return jwt.sign({ id, role }, env.JWT_SECRET, { expiresIn: '1h' });
}

module.exports = { bearerToken };
