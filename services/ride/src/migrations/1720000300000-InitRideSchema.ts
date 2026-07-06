import { MigrationInterface, QueryRunner } from 'typeorm';

/** Initial ride_db schema (docs/data-model.md · 07 ride_db). */
export class InitRideSchema1720000300000 implements MigrationInterface {
  name = 'InitRideSchema1720000300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "ride_status_enum" AS ENUM (
        'requested','matching','assigned','arriving','in_progress',
        'pending_payment','payment_failed','completed',
        'cancelled_by_passenger','cancelled_by_driver','cancelled_no_show','no_driver_found'
      );
      CREATE TYPE "payment_method_enum" AS ENUM ('cash','jazzcash','card');
      CREATE TYPE "transition_actor_enum" AS ENUM ('passenger','driver','system','admin');
    `);

    await queryRunner.query(`
      CREATE TABLE "rides" (
        "id" uuid PRIMARY KEY,
        "passenger_id" uuid NOT NULL,
        "driver_id" uuid,
        "vehicle_id" uuid,
        "status" "ride_status_enum" NOT NULL DEFAULT 'requested',
        "pickup_point" jsonb NOT NULL,
        "pickup_zone_id" uuid,
        "dropoff_point" jsonb,
        "requested_at" timestamptz NOT NULL,
        "assigned_at" timestamptz,
        "arrived_at" timestamptz,
        "started_at" timestamptz,
        "ended_at" timestamptz,
        "distance_m" double precision,
        "duration_s" int,
        "fare_paisa" bigint,
        "fare_config_version" int,
        "payment_method" "payment_method_enum",
        "cancel_reason" varchar,
        "rematch_count" int NOT NULL DEFAULT 0,
        "city_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX "ix_rides_passenger" ON "rides" ("passenger_id");
      CREATE INDEX "ix_rides_status" ON "rides" ("status");
      CREATE INDEX "ix_rides_driver" ON "rides" ("driver_id");
      -- One active ride per passenger and per driver (docs/specs.md §3 invariant).
      CREATE UNIQUE INDEX "uq_active_ride_passenger" ON "rides" ("passenger_id")
        WHERE "status" IN ('requested','matching','assigned','arriving','in_progress','pending_payment','payment_failed');
      CREATE UNIQUE INDEX "uq_active_ride_driver" ON "rides" ("driver_id")
        WHERE "driver_id" IS NOT NULL
          AND "status" IN ('assigned','arriving','in_progress','pending_payment','payment_failed');
    `);

    await queryRunner.query(`
      CREATE TABLE "ride_transitions" (
        "id" uuid PRIMARY KEY,
        "ride_id" uuid NOT NULL,
        "from_status" varchar,
        "to_status" varchar NOT NULL,
        "actor" "transition_actor_enum" NOT NULL,
        "actor_id" uuid,
        "meta" jsonb,
        "at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX "ix_transitions_ride" ON "ride_transitions" ("ride_id");
    `);

    await queryRunner.query(`
      CREATE TABLE "ratings" (
        "id" uuid PRIMARY KEY,
        "ride_id" uuid NOT NULL,
        "passenger_id" uuid NOT NULL,
        "driver_id" uuid NOT NULL,
        "stars" smallint NOT NULL,
        "comment" text,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX "uq_rating_ride" ON "ratings" ("ride_id");
    `);

    await queryRunner.query(`
      CREATE TABLE "sos_events" (
        "id" uuid PRIMARY KEY,
        "ride_id" uuid NOT NULL,
        "raised_by" uuid NOT NULL,
        "lat" double precision NOT NULL,
        "lon" double precision NOT NULL,
        "handled_by" uuid,
        "note" text,
        "at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX "ix_sos_ride" ON "sos_events" ("ride_id");
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
    await queryRunner.query(`DROP TABLE "sos_events";`);
    await queryRunner.query(`DROP TABLE "ratings";`);
    await queryRunner.query(`DROP TABLE "ride_transitions";`);
    await queryRunner.query(`DROP TABLE "rides";`);
    await queryRunner.query(`
      DROP TYPE "transition_actor_enum";
      DROP TYPE "payment_method_enum";
      DROP TYPE "ride_status_enum";
    `);
  }
}
