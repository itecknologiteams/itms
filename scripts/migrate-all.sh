#!/usr/bin/env bash
# Runs every service's pending migrations against the local/dev Postgres
# (docker-compose publishes it on localhost:5432 — see infra/docker-compose.yml).
# Dispatch is intentionally excluded: it's Redis-only, no SQL migrations.
set -euo pipefail

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
