#!/bin/sh

set -e

if [ "$1" = "migrate" ]; then
  echo "Running migration script..."
  npm run start:safe
elif [ "$1" = "start" ]; then
  echo "Starting Next.js app..."
  npm run start
else
  echo "Unknown command: $1"
  exec "$@"
fi
