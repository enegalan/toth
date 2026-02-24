import type { RawEditionRecord } from '@toth/shared';
import { EpublibreConnector } from './epublibre.connector';

const REQUIRED_KEYS: (keyof RawEditionRecord)[] = [
  'source_id',
  'external_id',
  'title',
  'authors',
  'language',
  'description',
  'subjects',
  'license',
  'download_url',
  'file_size',
  'published_date',
];

describe('EpublibreConnector', () => {
  const sourceId = 'test-source-id';
  const connector = new EpublibreConnector(sourceId);

  it('healthCheck returns boolean', async () => {
    const result = await connector.healthCheck();
    expect(typeof result).toBe('boolean');
  }, 15000);

  it('fetchCatalog yields valid RawEditionRecord shape', async () => {
    const gen = connector.fetchCatalog();
    const first = await gen.next();
    if (first.done) return;
    const record = first.value as RawEditionRecord;
    for (const key of REQUIRED_KEYS) {
      expect(record).toHaveProperty(key);
    }
    expect(record.source_id).toBe(sourceId);
    expect(typeof record.external_id).toBe('string');
    expect(Array.isArray(record.authors)).toBe(true);
    expect(typeof record.download_url).toBe('string');
    expect(record.download_url.length).toBeGreaterThan(0);
  }, 30000);
});
