import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedDefaultSources1730000000003 implements MigrationInterface {
  name = 'SeedDefaultSources1730000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "sources" (id, name, base_url, trust_score, license_type, connector_type, legal_basis, created_at, updated_at)
      SELECT uuid_generate_v4(), 'Project Gutenberg', 'https://www.gutenberg.org', 1, 'public-domain', 'gutenberg', 'Public domain works; distributed by Project Gutenberg.', now(), now()
      WHERE NOT EXISTS (SELECT 1 FROM "sources" WHERE connector_type = 'gutenberg')
    `);
    await queryRunner.query(`
      INSERT INTO "sources" (id, name, base_url, trust_score, license_type, connector_type, legal_basis, created_at, updated_at)
      SELECT uuid_generate_v4(), 'Standard Ebooks', 'https://standardebooks.org', 1, 'public-domain', 'standard_ebooks', 'Public domain; curated and produced by Standard Ebooks.', now(), now()
      WHERE NOT EXISTS (SELECT 1 FROM "sources" WHERE connector_type = 'standard_ebooks')
    `);
    await queryRunner.query(`
      INSERT INTO "sources" (id, name, base_url, trust_score, license_type, connector_type, legal_basis, created_at, updated_at)
      SELECT uuid_generate_v4(), 'Open Library', 'https://openlibrary.org', 0.9, 'public-domain', 'open_library', 'Open Library provides access to public domain and open-license editions.', now(), now()
      WHERE NOT EXISTS (SELECT 1 FROM "sources" WHERE connector_type = 'open_library')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "sources"
      WHERE connector_type IN ('gutenberg', 'standard_ebooks', 'open_library')
    `);
  }
}
