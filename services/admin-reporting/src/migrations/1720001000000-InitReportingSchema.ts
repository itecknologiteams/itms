import { MigrationInterface, QueryRunner } from 'typeorm';

/** Initial reporting_db schema (docs/data-model.md · 11 reporting_db). */
export class InitReportingSchema1720001000000 implements MigrationInterface {
  name = 'InitReportingSchema1720001000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "rides_daily" (
        "date" date NOT NULL,
        "zone_id" uuid NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        "city_id" uuid,
        "rides_completed" int NOT NULL DEFAULT 0,
        "rides_cancelled" int NOT NULL DEFAULT 0,
        "no_driver_count" int NOT NULL DEFAULT 0,
        "revenue_paisa" bigint NOT NULL DEFAULT 0,
        "avg_fare_paisa" double precision NOT NULL DEFAULT 0,
        "avg_match_seconds" double precision NOT NULL DEFAULT 0,
        PRIMARY KEY ("date","zone_id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "driver_performance" (
        "driver_id" uuid NOT NULL,
        "date" date NOT NULL,
        "rides" int NOT NULL DEFAULT 0,
        "online_hours" double precision NOT NULL DEFAULT 0,
        "earnings_paisa" bigint NOT NULL DEFAULT 0,
        "rating_avg" double precision NOT NULL DEFAULT 0,
        "violations" int NOT NULL DEFAULT 0,
        PRIMARY KEY ("driver_id","date")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "violation_summary" (
        "zone_id" uuid NOT NULL,
        "date" date NOT NULL,
        "opened" int NOT NULL DEFAULT 0,
        "auto_closed" int NOT NULL DEFAULT 0,
        "escalated" int NOT NULL DEFAULT 0,
        "avg_duration_s" double precision NOT NULL DEFAULT 0,
        PRIMARY KEY ("zone_id","date")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "payment_mix" (
        "date" date NOT NULL,
        "method" varchar NOT NULL,
        "count" int NOT NULL DEFAULT 0,
        "amount_paisa" bigint NOT NULL DEFAULT 0,
        PRIMARY KEY ("date","method")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "admin_audit_log" (
        "id" uuid PRIMARY KEY,
        "admin_id" uuid NOT NULL,
        "action" varchar NOT NULL,
        "entity" varchar NOT NULL,
        "entity_id" uuid NOT NULL,
        "before" jsonb,
        "after" jsonb,
        "ip" varchar,
        "at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX "ix_audit_admin" ON "admin_audit_log" ("admin_id");
      CREATE INDEX "ix_audit_entity" ON "admin_audit_log" ("entity_id");
    `);

    await queryRunner.query(`
      CREATE TABLE "processed_events" (
        "event_id" uuid NOT NULL,
        "projection_name" varchar NOT NULL,
        "processed_at" timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY ("event_id","projection_name")
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "processed_events";`);
    await queryRunner.query(`DROP TABLE "admin_audit_log";`);
    await queryRunner.query(`DROP TABLE "payment_mix";`);
    await queryRunner.query(`DROP TABLE "violation_summary";`);
    await queryRunner.query(`DROP TABLE "driver_performance";`);
    await queryRunner.query(`DROP TABLE "rides_daily";`);
  }
}
