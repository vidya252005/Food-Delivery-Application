const base = require('./jest.config');

module.exports = {
  ...base,
  globalSetup: undefined,
  testMatch: ['**/tests/unit/**/*.test.js'],
};
