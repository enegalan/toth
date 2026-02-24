import { MigrationInterface, QueryRunner } from 'typeorm';

export class LegalAndTakedown1730000000002 implements MigrationInterface {
  name = 'LegalAndTakedown1730000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "sources" ADD "legal_basis" text',
    );
    await queryRunner.query(`
      CREATE TABLE "takedown_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "claimant_email" varchar(500) NOT NULL,
        "reason" text NOT NULL,
        "work_id" varchar(2048),
        "edition_id" varchar(2048),
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "review_notes" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_takedown_requests" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "takedown_requests"');
    await queryRunner.query('ALTER TABLE "sources" DROP COLUMN "legal_basis"');
  }
}
