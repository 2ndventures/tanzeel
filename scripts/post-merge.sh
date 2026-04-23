#!/bin/bash
set -e

npm install

# Tanzeel does not use a database — the Drizzle config is leftover template
# boilerplate and there is no shared/schema.ts. Only run db:push if a schema
# file actually exists, otherwise skip cleanly so post-merge setup succeeds.
if [ -f "shared/schema.ts" ]; then
  npm run db:push
else
  echo "post-merge: no shared/schema.ts found, skipping db:push"
fi
