module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/setup/env.js'],
  globalSetup: '<rootDir>/tests/setup/globalSetup.js',
  testTimeout: 15000,
  collectCoverageFrom: ['src/**/*.js', '!src/server.js', '!src/db/migrate.js'],
  coverageThreshold: {
    global: {
      lines: 60,
      statements: 60,
    },
  },
};
