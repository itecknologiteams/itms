import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial tracking_db schema (docs/data-model.md · 06).
 * gps_logs becomes a TimescaleDB hypertable when the extension is available
 * (staging/prod); on the plain local PostGIS image it stays a regular table.
 * The conditional keeps `migration:run` working in every environment.
 */
export class InitTrackingSchema1720000200000 implements MigrationInterface {
  name = 'InitTrackingSchema1720000200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "gps_logs" (
        "time" timestamptz NOT NULL,
        "vehicle_id" uuid NOT NULL,
        "lat" double precision NOT NULL,
        "lon" double precision NOT NULL,
        "speed_kmh" double precision NOT NULL DEFAULT 0,
        "heading" double precision NOT NULL DEFAULT 0,
        "ignition" boolean NOT NULL DEFAULT false,
        "battery_pct" double precision,
        "source" varchar NOT NULL DEFAULT 'tracker',
        PRIMARY KEY ("time","vehicle_id")
      );
      CREATE INDEX "ix_gps_vehicle_time" ON "gps_logs" ("vehicle_id","time" DESC);
    `);

    // Enable TimescaleDB + hypertable only if the extension is installable.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'timescaledb') THEN
          CREATE EXTENSION IF NOT EXISTS timescaledb;
          PERFORM create_hypertable('gps_logs', 'time', if_not_exists => TRUE, migrate_data => TRUE);
        END IF;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'TimescaleDB not enabled (%). gps_logs stays a plain table.', SQLERRM;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE "trail_slices" (
        "id" uuid PRIMARY KEY,
        "ride_id" uuid NOT NULL,
        "vehicle_id" uuid NOT NULL,
        "from_ts" timestamptz NOT NULL,
        "to_ts" timestamptz NOT NULL,
        "distance_m" double precision NOT NULL DEFAULT 0,
        "point_count" int NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX "uq_trail_ride" ON "trail_slices" ("ride_id");
    `);

    await queryRunner.query(`
      CREATE TYPE "tracker_status_enum" AS ENUM ('ok','stale','dead');
      CREATE TABLE "tracker_health" (
        "vehicle_id" uuid PRIMARY KEY,
        "device_id" varchar,
        "last_ping_at" timestamptz NOT NULL,
        "status" "tracker_status_enum" NOT NULL DEFAULT 'ok'
      );
      CREATE INDEX "ix_tracker_status" ON "tracker_health" ("status");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "tracker_health";`);
    await queryRunner.query(`DROP TYPE "tracker_status_enum";`);
    await queryRunner.query(`DROP TABLE "trail_slices";`);
    await queryRunner.query(`DROP TABLE "gps_logs";`);
  }
}
