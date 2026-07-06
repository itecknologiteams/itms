import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial geofence_db schema (docs/data-model.md · 05 geofence_db).
 * Zones store authoritative GeoJSON in `boundary` (jsonb); a PostGIS `geom`
 * column is kept in sync by a trigger for spatial queries, with a GiST index.
 */
export class InitGeofenceSchema1720000100000 implements MigrationInterface {
  name = 'InitGeofenceSchema1720000100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis;`);

    await queryRunner.query(`
      CREATE TYPE "zone_status_enum" AS ENUM ('active','inactive');
      CREATE TYPE "violation_status_enum" AS ENUM
        ('open','auto_closed','acknowledged','resolved','escalated');
    `);

    await queryRunner.query(`
      CREATE TABLE "zones" (
        "id" uuid PRIMARY KEY,
        "name" varchar NOT NULL,
        "boundary" jsonb NOT NULL,
        "geom" geometry(Polygon,4326),
        "status" "zone_status_enum" NOT NULL DEFAULT 'active',
        "version" int NOT NULL DEFAULT 1,
        "city_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX "ix_zones_status" ON "zones" ("status");
      CREATE INDEX "gix_zones_geom" ON "zones" USING GIST ("geom");
    `);

    // Keep the PostGIS geometry in sync with the authoritative GeoJSON boundary.
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION zones_sync_geom() RETURNS trigger AS $$
      BEGIN
        NEW.geom := ST_SetSRID(ST_GeomFromGeoJSON(NEW.boundary::text), 4326);
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      CREATE TRIGGER trg_zones_sync_geom
      BEFORE INSERT OR UPDATE OF boundary ON "zones"
      FOR EACH ROW EXECUTE FUNCTION zones_sync_geom();
    `);

    await queryRunner.query(`
      CREATE TABLE "zone_versions" (
        "id" uuid PRIMARY KEY,
        "zone_id" uuid NOT NULL,
        "version" int NOT NULL,
        "boundary" jsonb NOT NULL,
        "changed_by" uuid,
        "changed_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX "ix_zone_versions_zone" ON "zone_versions" ("zone_id");
    `);

    await queryRunner.query(`
      CREATE TABLE "vehicle_zone_pairings" (
        "id" uuid PRIMARY KEY,
        "vehicle_id" uuid NOT NULL,
        "zone_id" uuid NOT NULL,
        "from_ts" timestamptz NOT NULL,
        "to_ts" timestamptz,
        "assigned_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX "ix_pairings_vehicle" ON "vehicle_zone_pairings" ("vehicle_id");
      CREATE INDEX "ix_pairings_open" ON "vehicle_zone_pairings" ("vehicle_id") WHERE "to_ts" IS NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE "movement_passes" (
        "id" uuid PRIMARY KEY,
        "vehicle_id" uuid NOT NULL,
        "reason" varchar NOT NULL,
        "granted_by" uuid,
        "from_ts" timestamptz NOT NULL,
        "to_ts" timestamptz NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX "ix_passes_vehicle" ON "movement_passes" ("vehicle_id");
    `);

    await queryRunner.query(`
      CREATE TABLE "violations" (
        "id" uuid PRIMARY KEY,
        "vehicle_id" uuid NOT NULL,
        "driver_id" uuid,
        "zone_id" uuid NOT NULL,
        "status" "violation_status_enum" NOT NULL DEFAULT 'open',
        "opened_at" timestamptz NOT NULL,
        "closed_at" timestamptz,
        "max_distance_m" double precision NOT NULL DEFAULT 0,
        "ack_by" uuid,
        "resolution_note" text,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX "ix_violations_status" ON "violations" ("status");
      CREATE INDEX "ix_violations_vehicle_time" ON "violations" ("vehicle_id","opened_at");
    `);

    await queryRunner.query(`
      CREATE TABLE "outbox" (
        "id" uuid PRIMARY KEY,
        "event_name" varchar NOT NULL,
        "payload" jsonb NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "sent_at" timestamptz
      );
      CREATE INDEX "ix_outbox_unsent" ON "outbox" ("created_at") WHERE "sent_at" IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "outbox";`);
    await queryRunner.query(`DROP TABLE "violations";`);
    await queryRunner.query(`DROP TABLE "movement_passes";`);
    await queryRunner.query(`DROP TABLE "vehicle_zone_pairings";`);
    await queryRunner.query(`DROP TABLE "zone_versions";`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_zones_sync_geom ON "zones";`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS zones_sync_geom;`);
    await queryRunner.query(`DROP TABLE "zones";`);
    await queryRunner.query(`DROP TYPE "violation_status_enum";`);
    await queryRunner.query(`DROP TYPE "zone_status_enum";`);
  }
}
