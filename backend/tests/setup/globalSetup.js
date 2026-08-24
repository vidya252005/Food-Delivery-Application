// Runs once before the whole test suite: applies migrations to the test
// database so integration/system tests start from a known schema.
const { execFileSync } = require('child_process');
const path = require('path');

module.exports = async function globalSetup() {
  execFileSync('node', [path.join(__dirname, '..', '..', 'src', 'db', 'migrate.js')], {
    stdio: 'inherit',
    env: {
      ...process.env,
      PG_DATABASE: process.env.PG_TEST_DATABASE || 'food_delivery_test',
    },
  });
};
