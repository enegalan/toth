#!/bin/sh
set -e
cd /app
if [ -f "dist/apps/api/src/database/data-source.js" ]; then
  node ./node_modules/typeorm/cli.js migration:run \
    -d dist/apps/api/src/database/data-source.js \
    || true
fi
exec node dist/apps/api/src/main.js
