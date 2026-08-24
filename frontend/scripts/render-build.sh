#!/usr/bin/env sh
set -e

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT/frontend"

if [ -z "$REACT_APP_API_URL" ] && [ -n "$FOODCLUB_API_HOST" ]; then
  export REACT_APP_API_URL="https://${FOODCLUB_API_HOST}/api"
fi

if [ -z "$REACT_APP_API_URL" ]; then
  echo "ERROR: Set REACT_APP_API_URL or FOODCLUB_API_HOST before building."
  exit 1
fi

echo "Building frontend with REACT_APP_API_URL=$REACT_APP_API_URL"
npm ci
npm run build
