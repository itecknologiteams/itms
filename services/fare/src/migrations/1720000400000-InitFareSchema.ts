import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial fare_db schema (docs/data-model.md · 08 fare_db). Seeds one baseline
 * fare_configs row (version 1) so the engine is usable before the client's real
 * formula values arrive (OPEN-1) — the exact rates are a placeholder, clearly
 * documented, and replaceable via a new versioned row without downtime.
 */
export class InitFareSchema1720000400000 implements MigrationInterface {
  name = 'InitFareSchema1720000400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
    await queryRunner.query(`CREATE TYPE "rounding_rule_enum" AS ENUM ('nearest_10','none');`);

    await queryRunner.query(`
      CREATE TABLE "fare_configs" (
        "id" uuid PRIMARY KEY,
        "version" int NOT NULL,
        "base_paisa" bigint NOT NULL,
        "per_km_paisa" bigint NOT NULL,
        "per_min_paisa" bigint NOT NULL,
        "minimum_paisa" bigint NOT NULL,
        "rounding" "rounding_rule_enum" NOT NULL DEFAULT 'nearest_10',
        "night_multiplier" numeric,
        "effective_from" timestamptz NOT NULL,
        "created_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX "uq_fare_configs_version" ON "fare_configs" ("version");
      CREATE INDEX "ix_fare_configs_effective" ON "fare_configs" ("effective_from");
    `);

    await queryRunner.query(`
      CREATE TABLE "zone_fare_overrides" (
        "id" uuid PRIMARY KEY,
        "fare_config_version" int NOT NULL,
        "zone_id" uuid NOT NULL,
        "per_km_paisa" bigint,
        "per_min_paisa" bigint,
        "multiplier" numeric
      );
      CREATE INDEX "ix_overrides_version" ON "zone_fare_overrides" ("fare_config_version");
      CREATE INDEX "ix_overrides_zone" ON "zone_fare_overrides" ("zone_id");
    `);

    await queryRunner.query(`
      CREATE TABLE "fare_calculations" (
        "id" uuid PRIMARY KEY,
        "ride_id" uuid NOT NULL,
        "fare_config_version" int NOT NULL,
        "distance_m" double precision NOT NULL,
        "duration_s" int NOT NULL,
        "base_paisa" bigint NOT NULL,
        "distance_component_paisa" bigint NOT NULL,
        "time_component_paisa" bigint NOT NULL,
        "adjustments" jsonb NOT NULL DEFAULT '{}',
        "total_paisa" bigint NOT NULL,
        "computed_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX "uq_fare_calc_ride" ON "fare_calculations" ("ride_id");
    `);

    await queryRunner.query(`
      CREATE TABLE "fare_adjustments" (
        "id" uuid PRIMARY KEY,
        "ride_id" uuid NOT NULL,
        "old_total_paisa" bigint NOT NULL,
        "new_total_paisa" bigint NOT NULL,
        "reason" text NOT NULL,
        "adjusted_by" uuid NOT NULL,
        "at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX "ix_fare_adjustments_ride" ON "fare_adjustments" ("ride_id");
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

    // Placeholder baseline config (OPEN-1): PKR 100 base, PKR 50/km, PKR 2/min, PKR 150 minimum.
    await queryRunner.query(`
      INSERT INTO "fare_configs"
        ("id", "version", "base_paisa", "per_km_paisa", "per_min_paisa", "minimum_paisa", "rounding", "effective_from")
      VALUES
        (gen_random_uuid(), 1, 10000, 5000, 200, 15000, 'nearest_10', now());
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "outbox";`);
    await queryRunner.query(`DROP TABLE "fare_adjustments";`);
    await queryRunner.query(`DROP TABLE "fare_calculations";`);
    await queryRunner.query(`DROP TABLE "zone_fare_overrides";`);
    await queryRunner.query(`DROP TABLE "fare_configs";`);
    await queryRunner.query(`DROP TYPE "rounding_rule_enum";`);
  }
}
