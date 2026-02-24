import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateEpublibreBaseUrl1730000000011 implements MigrationInterface {
  name = 'UpdateEpublibreBaseUrl1730000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "sources"
      SET base_url = 'https://epublibre.bid', legal_basis = 'Free EPUB catalog. Site moved to epublibre.bid. Legal basis per site.', updated_at = now()
      WHERE connector_type = 'epublibre'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "sources"
      SET base_url = 'https://www.epublibre.org', legal_basis = 'Free EPUB catalog; downloads via magnet links. Legal basis per site.', updated_at = now()
      WHERE connector_type = 'epublibre'
    `);
  }
}
