import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial auth_db schema (docs/data-model.md · 01 auth_db).
 * Tables: users, otp_challenges, refresh_tokens, devices, outbox.
 */
export class InitAuthSchema1720000000000 implements MigrationInterface {
  name = 'InitAuthSchema1720000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "users_role_enum" AS ENUM
        ('passenger','driver','admin_operator','admin_supervisor','admin_super');
      CREATE TYPE "users_status_enum" AS ENUM ('active','blocked');
      CREATE TYPE "otp_purpose_enum" AS ENUM ('login','register');
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY,
        "phone" varchar NOT NULL,
        "phone_verified_at" timestamptz,
        "email" varchar,
        "password_hash" varchar,
        "role" "users_role_enum" NOT NULL,
        "status" "users_status_enum" NOT NULL DEFAULT 'active',
        "totp_secret" varchar,
        "last_login_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX "uq_users_phone" ON "users" ("phone");
      CREATE UNIQUE INDEX "uq_users_email" ON "users" ("email") WHERE "email" IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE "otp_challenges" (
        "id" uuid PRIMARY KEY,
        "phone" varchar NOT NULL,
        "code_hash" varchar NOT NULL,
        "purpose" "otp_purpose_enum" NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "attempts" int NOT NULL DEFAULT 0,
        "consumed_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX "ix_otp_phone" ON "otp_challenges" ("phone");
      CREATE INDEX "ix_otp_lookup" ON "otp_challenges" ("phone","purpose","consumed_at");
    `);

    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid PRIMARY KEY,
        "user_id" uuid NOT NULL,
        "token_hash" varchar NOT NULL,
        "family_id" uuid NOT NULL,
        "device_id" varchar,
        "expires_at" timestamptz NOT NULL,
        "revoked_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX "uq_refresh_hash" ON "refresh_tokens" ("token_hash");
      CREATE INDEX "ix_refresh_user" ON "refresh_tokens" ("user_id");
      CREATE INDEX "ix_refresh_family" ON "refresh_tokens" ("family_id");
    `);

    await queryRunner.query(`
      CREATE TABLE "devices" (
        "id" uuid PRIMARY KEY,
        "user_id" uuid NOT NULL,
        "platform" varchar,
        "fcm_token" varchar,
        "model" varchar,
        "app_version" varchar,
        "is_active" boolean NOT NULL DEFAULT true,
        "last_seen_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX "ix_devices_user" ON "devices" ("user_id");
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
    await queryRunner.query(`DROP TABLE "devices";`);
    await queryRunner.query(`DROP TABLE "refresh_tokens";`);
    await queryRunner.query(`DROP TABLE "otp_challenges";`);
    await queryRunner.query(`DROP TABLE "users";`);
    await queryRunner.query(`
      DROP TYPE "otp_purpose_enum";
      DROP TYPE "users_status_enum";
      DROP TYPE "users_role_enum";
    `);
  }
}
