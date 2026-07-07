#!/usr/bin/env bash
# Runs every service's pending migrations against the local/dev Postgres
# (docker-compose publishes it on localhost:5432 — see infra/docker-compose.yml).
# Dispatch is intentionally excluded: it's Redis-only, no SQL migrations.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Host-run npm scripts don't get .env loaded automatically (only docker-compose
# reads its own hardcoded environment: blocks) — load it here so `cp
# .env.example .env` is enough to make this work.
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

export POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
export POSTGRES_PORT="${POSTGRES_PORT:-5432}"
export POSTGRES_USER="${POSTGRES_USER:-itms}"
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-itms_dev_password}"

SERVICES=(auth passenger driver geofence tracking ride fare payment document notification admin-reporting)

for svc in "${SERVICES[@]}"; do
  echo "── Migrating ${svc} ──"
  npm run -w "@itms/${svc}-service" migration:run
done

echo "All migrations complete."
