import { MigrationInterface, QueryRunner } from 'typeorm';

/** Initial passenger_db schema (docs/data-model.md · 02 passenger_db). */
export class InitPassengerSchema1720000700000 implements MigrationInterface {
  name = 'InitPassengerSchema1720000700000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "passenger_status_enum" AS ENUM ('active','blocked');
      CREATE TYPE "language_enum" AS ENUM ('en','ur');
      CREATE TYPE "saved_method_type_enum" AS ENUM ('jazzcash','card');
    `);

    await queryRunner.query(`
      CREATE TABLE "passengers" (
        "id" uuid PRIMARY KEY,
        "auth_user_id" uuid NOT NULL,
        "name" varchar NOT NULL,
        "phone" varchar NOT NULL,
        "email" varchar,
        "language" "language_enum" NOT NULL DEFAULT 'en',
        "status" "passenger_status_enum" NOT NULL DEFAULT 'active',
        "unsettled_ride_id" uuid,
        "rating_avg" numeric NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX "uq_passengers_auth_user" ON "passengers" ("auth_user_id");
      CREATE UNIQUE INDEX "uq_passengers_phone" ON "passengers" ("phone");
      CREATE INDEX "ix_passengers_status" ON "passengers" ("status");
    `);

    await queryRunner.query(`
      CREATE TABLE "saved_methods" (
        "id" uuid PRIMARY KEY,
        "passenger_id" uuid NOT NULL,
        "type" "saved_method_type_enum" NOT NULL,
        "gateway_token" varchar NOT NULL,
        "label" varchar,
        "is_default" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX "ix_saved_methods_passenger" ON "saved_methods" ("passenger_id");
    `);

    await queryRunner.query(`
      CREATE TABLE "ride_history_proj" (
        "ride_id" uuid PRIMARY KEY,
        "passenger_id" uuid NOT NULL,
        "driver_name" varchar,
        "plate_no" varchar,
        "started_at" timestamptz,
        "ended_at" timestamptz,
        "distance_m" double precision,
        "duration_s" int,
        "fare_paisa" bigint,
        "payment_method" varchar,
        "status" varchar NOT NULL
      );
      CREATE INDEX "ix_history_passenger" ON "ride_history_proj" ("passenger_id");
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
    await queryRunner.query(`DROP TABLE "ride_history_proj";`);
    await queryRunner.query(`DROP TABLE "saved_methods";`);
    await queryRunner.query(`DROP TABLE "passengers";`);
    await queryRunner.query(`
      DROP TYPE "saved_method_type_enum";
      DROP TYPE "language_enum";
      DROP TYPE "passenger_status_enum";
    `);
  }
}
