import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSourceConnectorType1730000000001 implements MigrationInterface {
  name = 'AddSourceConnectorType1730000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "sources" ADD "connector_type" varchar(50)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "sources" DROP COLUMN "connector_type"');
  }
}
