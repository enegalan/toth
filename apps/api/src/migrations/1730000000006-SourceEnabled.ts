import { MigrationInterface, QueryRunner } from 'typeorm';

export class SourceEnabled1730000000006 implements MigrationInterface {
  name = 'SourceEnabled1730000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "sources" ADD "enabled" boolean NOT NULL DEFAULT true',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "sources" DROP COLUMN "enabled"');
  }
}
