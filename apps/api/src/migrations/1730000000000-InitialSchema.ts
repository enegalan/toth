import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1730000000000 implements MigrationInterface {
  name = 'InitialSchema1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await queryRunner.query(`
      CREATE TABLE "authors" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "canonical_name" varchar(500) NOT NULL,
        "aliases" jsonb NOT NULL DEFAULT '[]',
        "birth_year" int,
        "death_year" int,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_authors" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "sources" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" varchar(255) NOT NULL,
        "base_url" varchar(2048) NOT NULL,
        "trust_score" decimal(3,2) NOT NULL DEFAULT 1,
        "license_type" varchar(100) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sources" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "works" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "canonical_title" varchar(1000) NOT NULL,
        "author_id" uuid NOT NULL,
        "language" varchar(20) NOT NULL,
        "description" text,
        "subjects" jsonb NOT NULL DEFAULT '[]',
        "popularity_score" decimal(10,4) NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_works" PRIMARY KEY ("id"),
        CONSTRAINT "FK_works_author" FOREIGN KEY ("author_id") REFERENCES "authors"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_works_author_id" ON "works" ("author_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_works_language" ON "works" ("language")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_works_updated_at" ON "works" ("updated_at")',
    );
    await queryRunner.query(`
      CREATE TABLE "editions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "work_id" uuid NOT NULL,
        "source_id" uuid NOT NULL,
        "license" varchar(100) NOT NULL,
        "file_size" bigint,
        "download_url" varchar(2048) NOT NULL,
        "quality_score" decimal(5,4) NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_editions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_editions_work" FOREIGN KEY ("work_id") REFERENCES "works"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_editions_source" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_editions_work_id" ON "editions" ("work_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_editions_source_id" ON "editions" ("source_id")',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_editions_license" ON "editions" ("license")',
    );
    await queryRunner.query(`
      CREATE TABLE "ingestion_jobs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "source_id" uuid NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "started_at" timestamptz,
        "completed_at" timestamptz,
        "error_message" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ingestion_jobs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ingestion_jobs_source" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_ingestion_jobs_source_id" ON "ingestion_jobs" ("source_id")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "ingestion_jobs"');
    await queryRunner.query('DROP TABLE "editions"');
    await queryRunner.query('DROP TABLE "works"');
    await queryRunner.query('DROP TABLE "sources"');
    await queryRunner.query('DROP TABLE "authors"');
  }
}
