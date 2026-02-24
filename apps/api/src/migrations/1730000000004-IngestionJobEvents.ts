import { MigrationInterface, QueryRunner } from 'typeorm';

export class IngestionJobEvents1730000000004 implements MigrationInterface {
  name = 'IngestionJobEvents1730000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ingestion_job_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "job_id" uuid NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "event_type" varchar(50) NOT NULL,
        "message" text,
        "detail" jsonb,
        CONSTRAINT "PK_ingestion_job_events" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ingestion_job_events_job" FOREIGN KEY ("job_id") REFERENCES "ingestion_jobs"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_ingestion_job_events_job_created" ON "ingestion_job_events" ("job_id", "created_at")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_ingestion_job_events_job_created"');
    await queryRunner.query('DROP TABLE "ingestion_job_events"');
  }
}
