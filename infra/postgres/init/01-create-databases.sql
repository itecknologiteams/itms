-- Creates one logical database per microservice on the local cluster.
-- Enforces the "database-per-service" rule from docs/architecture.md §1.
-- Production uses per-service credentials with no cross-DB grants (docs/techstack.md §5).
--
-- NOTE: this runs only on first cluster init (empty ./volumes/postgres).
-- To re-run after adding a service: `docker compose exec postgres psql -U itms -f ...`
-- or drop the volume and bring the stack back up.

\set ON_ERROR_STOP on

CREATE DATABASE auth_db;
CREATE DATABASE passenger_db;
CREATE DATABASE driver_db;
CREATE DATABASE geofence_db;
CREATE DATABASE tracking_db;
CREATE DATABASE ride_db;
CREATE DATABASE fare_db;
CREATE DATABASE payment_db;
CREATE DATABASE notif_db;
CREATE DATABASE reporting_db;
CREATE DATABASE document_db;
-- Dispatch owns Redis (in-memory) with a durable journal in ride_db; no dedicated SQL DB.

-- Geospatial extensions where needed (image is postgis/postgis).
\connect geofence_db
CREATE EXTENSION IF NOT EXISTS postgis;

\connect tracking_db
CREATE EXTENSION IF NOT EXISTS postgis;
-- TimescaleDB is enabled in the tracking service migrations against a Timescale-enabled
-- image in staging/prod; local dev uses plain hypertable-less tables unless the Timescale
-- image is swapped in. See docs/devops.md §1.

\connect ride_db
CREATE EXTENSION IF NOT EXISTS postgis;
