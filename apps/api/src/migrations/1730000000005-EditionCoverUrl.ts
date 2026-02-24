import { MigrationInterface, QueryRunner } from 'typeorm';

export class EditionCoverUrl1730000000005 implements MigrationInterface {
  name = 'EditionCoverUrl1730000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "editions" ADD "cover_url" varchar(2048)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "editions" DROP COLUMN "cover_url"');
  }
}
