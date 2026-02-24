import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedEpublibreSource1730000000010 implements MigrationInterface {
  name = 'SeedEpublibreSource1730000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "sources" (id, name, base_url, trust_score, license_type, connector_type, legal_basis, created_at, updated_at)
      SELECT uuid_generate_v4(), 'ePubLibre', 'https://epublibre.bid', 0.8, 'public-domain', 'epublibre', 'Free EPUB catalog. Site at epublibre.bid. Legal basis per site.', now(), now()
      WHERE NOT EXISTS (SELECT 1 FROM "sources" WHERE connector_type = 'epublibre')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "sources"
      WHERE connector_type = 'epublibre'
    `);
  }
}
