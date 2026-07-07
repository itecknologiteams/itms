import { MigrationInterface, QueryRunner } from 'typeorm';

/** Initial driver_db schema (docs/data-model.md · 03 driver_db). */
export class InitDriverSchema1720000600000 implements MigrationInterface {
  name = 'InitDriverSchema1720000600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "driver_status_enum" AS ENUM ('pending','approved','suspended','retired');
      CREATE TYPE "online_status_enum" AS ENUM ('offline','online','on_trip');
      CREATE TYPE "vehicle_status_enum" AS ENUM ('active','maintenance','retired');
      CREATE TYPE "document_type_enum" AS ENUM ('license','cnic','photo','registration');
      CREATE TYPE "document_review_status_enum" AS ENUM ('pending','approved','rejected');
      CREATE TYPE "suspension_source_enum" AS ENUM ('admin','violation_policy');
    `);

    await queryRunner.query(`
      CREATE TABLE "drivers" (
        "id" uuid PRIMARY KEY,
        "auth_user_id" uuid NOT NULL,
        "name" varchar NOT NULL,
        "phone" varchar NOT NULL,
        "cnic" varchar,
        "license_no" varchar,
        "license_expiry" date,
        "photo_doc_id" uuid,
        "status" "driver_status_enum" NOT NULL DEFAULT 'pending',
        "online" "online_status_enum" NOT NULL DEFAULT 'offline',
        "current_vehicle_id" uuid,
        "rating_avg" numeric NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX "uq_drivers_auth_user" ON "drivers" ("auth_user_id");
      CREATE UNIQUE INDEX "uq_drivers_phone" ON "drivers" ("phone");
      CREATE INDEX "ix_drivers_status" ON "drivers" ("status");
    `);

    await queryRunner.query(`
      CREATE TABLE "vehicles" (
        "id" uuid PRIMARY KEY,
        "plate_no" varchar NOT NULL,
        "model" varchar NOT NULL,
        "year" int,
        "color" varchar,
        "tracker_device_id" varchar NOT NULL,
        "status" "vehicle_status_enum" NOT NULL DEFAULT 'active',
        "city_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX "uq_vehicles_plate" ON "vehicles" ("plate_no");
      CREATE UNIQUE INDEX "uq_vehicles_tracker" ON "vehicles" ("tracker_device_id");
    `);

    await queryRunner.query(`
      CREATE TABLE "driver_vehicle_assignments" (
        "id" uuid PRIMARY KEY,
        "driver_id" uuid NOT NULL,
        "vehicle_id" uuid NOT NULL,
        "from_ts" timestamptz NOT NULL,
        "to_ts" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX "ix_assignments_driver" ON "driver_vehicle_assignments" ("driver_id");
      CREATE INDEX "ix_assignments_vehicle" ON "driver_vehicle_assignments" ("vehicle_id");
    `);

    await queryRunner.query(`
      CREATE TABLE "driver_documents" (
        "id" uuid PRIMARY KEY,
        "driver_id" uuid NOT NULL,
        "type" "document_type_enum" NOT NULL,
        "media_id" uuid NOT NULL,
        "status" "document_review_status_enum" NOT NULL DEFAULT 'pending',
        "reviewed_by" uuid,
        "expiry_date" date,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX "ix_documents_driver" ON "driver_documents" ("driver_id");
    `);

    await queryRunner.query(`
      CREATE TABLE "suspensions" (
        "id" uuid PRIMARY KEY,
        "driver_id" uuid NOT NULL,
        "reason" text NOT NULL,
        "source" "suspension_source_enum" NOT NULL,
        "from_ts" timestamptz NOT NULL,
        "to_ts" timestamptz,
        "lifted_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX "ix_suspensions_driver" ON "suspensions" ("driver_id");
      CREATE INDEX "ix_suspensions_open" ON "suspensions" ("driver_id") WHERE "to_ts" IS NULL;
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
    await queryRunner.query(`DROP TABLE "suspensions";`);
    await queryRunner.query(`DROP TABLE "driver_documents";`);
    await queryRunner.query(`DROP TABLE "driver_vehicle_assignments";`);
    await queryRunner.query(`DROP TABLE "vehicles";`);
    await queryRunner.query(`DROP TABLE "drivers";`);
    await queryRunner.query(`
      DROP TYPE "suspension_source_enum";
      DROP TYPE "document_review_status_enum";
      DROP TYPE "document_type_enum";
      DROP TYPE "vehicle_status_enum";
      DROP TYPE "online_status_enum";
      DROP TYPE "driver_status_enum";
    `);
  }
}
