import { MigrationInterface, QueryRunner } from 'typeorm';

export class WorkViewCount1730000000008 implements MigrationInterface {
  name = 'WorkViewCount1730000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "works"
      ADD COLUMN "view_count" integer NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "works"
      DROP COLUMN "view_count"
    `);
  }
}
