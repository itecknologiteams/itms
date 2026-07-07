import { MigrationInterface, QueryRunner } from 'typeorm';

/** Initial payment_db schema (docs/data-model.md · 09 payment_db). */
export class InitPaymentSchema1720000500000 implements MigrationInterface {
  name = 'InitPaymentSchema1720000500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "payment_method_enum" AS ENUM ('cash','jazzcash','card');
      CREATE TYPE "payment_status_enum" AS ENUM
        ('initiated','pending_gateway','succeeded','failed','refunded');
      CREATE TYPE "refund_status_enum" AS ENUM ('pending','succeeded','failed');
      CREATE TYPE "reconciliation_gateway_enum" AS ENUM ('jazzcash','card');
    `);

    await queryRunner.query(`
      CREATE TABLE "payable_rides" (
        "ride_id" uuid PRIMARY KEY,
        "amount_paisa" bigint NOT NULL,
        "fare_config_version" int NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id" uuid PRIMARY KEY,
        "ride_id" uuid NOT NULL,
        "method" "payment_method_enum" NOT NULL,
        "amount_paisa" bigint NOT NULL,
        "status" "payment_status_enum" NOT NULL DEFAULT 'initiated',
        "attempt_n" int NOT NULL,
        "idempotency_key" varchar NOT NULL,
        "gateway_txn_ref" varchar,
        "gateway_response" jsonb,
        "initiated_at" timestamptz NOT NULL DEFAULT now(),
        "settled_at" timestamptz
      );
      CREATE INDEX "ix_payments_ride" ON "payments" ("ride_id");
      CREATE INDEX "ix_payments_status" ON "payments" ("status");
      CREATE UNIQUE INDEX "uq_payments_idempotency" ON "payments" ("idempotency_key");
      CREATE UNIQUE INDEX "uq_payments_txn_ref" ON "payments" ("gateway_txn_ref") WHERE "gateway_txn_ref" IS NOT NULL;
      -- At most one successful payment per ride (docs/specs.md §8.2).
      CREATE UNIQUE INDEX "uq_payments_one_success_per_ride" ON "payments" ("ride_id") WHERE "status" = 'succeeded';
    `);

    await queryRunner.query(`
      CREATE TABLE "refunds" (
        "id" uuid PRIMARY KEY,
        "payment_id" uuid NOT NULL,
        "amount_paisa" bigint NOT NULL,
        "reason" text NOT NULL,
        "initiated_by" uuid NOT NULL,
        "gateway_ref" varchar,
        "status" "refund_status_enum" NOT NULL DEFAULT 'pending',
        "at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX "ix_refunds_payment" ON "refunds" ("payment_id");
    `);

    await queryRunner.query(`
      CREATE TABLE "reconciliations" (
        "id" uuid PRIMARY KEY,
        "date" date NOT NULL,
        "gateway" "reconciliation_gateway_enum" NOT NULL,
        "report_url" varchar,
        "matched_count" int NOT NULL DEFAULT 0,
        "mismatched_count" int NOT NULL DEFAULT 0,
        "status" varchar NOT NULL DEFAULT 'pending',
        "notes" text,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
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
    await queryRunner.query(`DROP TABLE "reconciliations";`);
    await queryRunner.query(`DROP TABLE "refunds";`);
    await queryRunner.query(`DROP TABLE "payments";`);
    await queryRunner.query(`DROP TABLE "payable_rides";`);
    await queryRunner.query(`
      DROP TYPE "reconciliation_gateway_enum";
      DROP TYPE "refund_status_enum";
      DROP TYPE "payment_status_enum";
      DROP TYPE "payment_method_enum";
    `);
  }
}
