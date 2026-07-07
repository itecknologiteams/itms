import { MigrationInterface, QueryRunner } from 'typeorm';

/** Initial document_db schema (docs/data-model.md · 12 document/media). */
export class InitDocumentSchema1720000800000 implements MigrationInterface {
  name = 'InitDocumentSchema1720000800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "owner_type_enum" AS ENUM ('driver','ride','admin');
      CREATE TYPE "media_kind_enum" AS ENUM ('license','cnic','photo','registration','receipt_pdf');
      CREATE TYPE "scan_status_enum" AS ENUM ('pending','clean','infected');
    `);

    await queryRunner.query(`
      CREATE TABLE "media" (
        "id" uuid PRIMARY KEY,
        "owner_type" "owner_type_enum" NOT NULL,
        "owner_id" uuid NOT NULL,
        "kind" "media_kind_enum" NOT NULL,
        "bucket_key" varchar NOT NULL,
        "mime" varchar NOT NULL,
        "size_bytes" bigint,
        "sha256" varchar,
        "scan_status" "scan_status_enum" NOT NULL DEFAULT 'pending',
        "uploaded_by" uuid NOT NULL,
        "finalized_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX "ix_media_owner" ON "media" ("owner_id");
      CREATE INDEX "ix_media_scan_status" ON "media" ("scan_status");
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
    await queryRunner.query(`DROP TABLE "media";`);
    await queryRunner.query(`
      DROP TYPE "scan_status_enum";
      DROP TYPE "media_kind_enum";
      DROP TYPE "owner_type_enum";
    `);
  }
}
