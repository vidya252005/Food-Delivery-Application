#!/bin/sh
set -e
echo "Running migrations..."
node src/db/migrate.js
echo "Starting server..."
exec node src/server.js
