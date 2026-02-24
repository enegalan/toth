import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedEpubbooksSource1730000000012 implements MigrationInterface {
  name = 'SeedEpubbooksSource1730000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "sources" (id, name, base_url, trust_score, license_type, connector_type, legal_basis, created_at, updated_at)
      SELECT uuid_generate_v4(), 'epubBooks', 'https://www.epubbooks.com', 0.8, 'public-domain', 'epubbooks', 'Free EPUB and Kindle catalog. Legal basis per site.', now(), now()
      WHERE NOT EXISTS (SELECT 1 FROM "sources" WHERE connector_type = 'epubbooks')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "sources"
      WHERE connector_type = 'epubbooks'
    `);
  }
}
