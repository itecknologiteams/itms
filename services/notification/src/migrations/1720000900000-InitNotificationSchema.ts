import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Initial notif_db schema (docs/data-model.md · 10 notif_db). Seeds the core
 * bilingual templates from the notification matrix (docs/specs.md §10) so the
 * service is usable immediately; more can be added via the admin API without
 * a deploy.
 */
export class InitNotificationSchema1720000900000 implements MigrationInterface {
  name = 'InitNotificationSchema1720000900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
    await queryRunner.query(`
      CREATE TYPE "channel_enum" AS ENUM ('push','sms');
      CREATE TYPE "lang_enum" AS ENUM ('en','ur');
      CREATE TYPE "notification_status_enum" AS ENUM ('queued','sent','delivered','failed');
      CREATE TYPE "broadcast_audience_enum" AS ENUM ('all_drivers','all_passengers');
    `);

    await queryRunner.query(`
      CREATE TABLE "templates" (
        "id" uuid PRIMARY KEY,
        "key" varchar NOT NULL,
        "channel" "channel_enum" NOT NULL,
        "lang" "lang_enum" NOT NULL,
        "title" varchar,
        "body" text NOT NULL,
        "updated_by" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX "uq_templates_key_channel_lang" ON "templates" ("key","channel","lang");
    `);

    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid PRIMARY KEY,
        "user_id" uuid NOT NULL,
        "channel" "channel_enum" NOT NULL,
        "template_key" varchar NOT NULL,
        "payload" jsonb NOT NULL,
        "status" "notification_status_enum" NOT NULL DEFAULT 'queued',
        "provider_ref" varchar,
        "sent_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX "ix_notifications_user" ON "notifications" ("user_id");
      CREATE INDEX "ix_notifications_status" ON "notifications" ("status");
    `);

    await queryRunner.query(`
      CREATE TABLE "broadcasts" (
        "id" uuid PRIMARY KEY,
        "audience" "broadcast_audience_enum" NOT NULL,
        "template_key" varchar NOT NULL,
        "sent_by" uuid NOT NULL,
        "count" int NOT NULL DEFAULT 0,
        "at" timestamptz NOT NULL DEFAULT now()
      );
    `);

    // Seed templates per the notification matrix (docs/specs.md §10), EN + UR.
    const seed: Array<[string, 'push' | 'sms', 'en' | 'ur', string, string]> = [
      ['driver_assigned', 'push', 'en', 'Driver assigned', 'Your driver {{driver_name}} is on the way.'],
      ['driver_assigned', 'push', 'ur', 'ڈرائیور مختص', 'آپ کا ڈرائیور {{driver_name}} راستے میں ہے۔'],
      ['driver_arrived', 'push', 'en', 'Driver arrived', 'Your driver has arrived at the pickup point.'],
      ['driver_arrived', 'sms', 'en', null as unknown as string, 'Your ITMS driver has arrived.'],
      ['fare_ready', 'push', 'en', 'Fare ready', 'Your fare is PKR {{amount_pkr}}. Tap to pay.'],
      ['payment_success', 'push', 'en', 'Payment received', 'Payment of PKR {{amount_pkr}} received. Thank you!'],
      ['payment_failed', 'push', 'en', 'Payment failed', 'Your payment could not be completed. Please retry or pay cash.'],
      ['ride_cancelled', 'push', 'en', 'Ride cancelled', 'Your ride has been cancelled ({{reason}}).'],
      ['no_driver_found', 'push', 'en', 'No driver available', 'No driver is available right now. Please try again shortly.'],
      ['driver_document_expiring', 'push', 'en', 'Document expiring', 'Your {{document_type}} expires on {{expiry_date}}. Please renew it.'],
    ];
    for (const [key, channel, lang, title, body] of seed) {
      await queryRunner.query(
        `INSERT INTO "templates" ("id","key","channel","lang","title","body")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)`,
        [key, channel, lang, title, body],
      );
    }

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
    await queryRunner.query(`DROP TABLE "broadcasts";`);
    await queryRunner.query(`DROP TABLE "notifications";`);
    await queryRunner.query(`DROP TABLE "templates";`);
    await queryRunner.query(`
      DROP TYPE "broadcast_audience_enum";
      DROP TYPE "notification_status_enum";
      DROP TYPE "lang_enum";
      DROP TYPE "channel_enum";
    `);
  }
}
