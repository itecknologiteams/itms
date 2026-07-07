#!/usr/bin/env bash
# Thin wrapper so `npm run bootstrap:admin` loads .env the same way
# migrate-all.sh does — host-run npm scripts don't get .env loaded
# automatically (only docker-compose reads its own hardcoded environment:
# blocks), so without this a fresh `cp .env.example .env` wouldn't be enough.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

npm run -w @itms/auth-service bootstrap:admin
