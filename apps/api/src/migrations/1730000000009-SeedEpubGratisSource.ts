import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedEpubGratisSource1730000000009 implements MigrationInterface {
  name = 'SeedEpubGratisSource1730000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "sources" (id, name, base_url, trust_score, license_type, connector_type, legal_basis, created_at, updated_at)
      SELECT uuid_generate_v4(), 'Epub.gratis', 'https://epub.gratis', 0.8, 'public-domain', 'epub_gratis', 'Free EPUB catalog; legal basis per site.', now(), now()
      WHERE NOT EXISTS (SELECT 1 FROM "sources" WHERE connector_type = 'epub_gratis')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "sources"
      WHERE connector_type = 'epub_gratis'
    `);
  }
}
