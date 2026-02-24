import { Test, TestingModule } from '@nestjs/testing';
import { MeilisearchService } from './meilisearch.service';
import { AppConfigService } from '../config/app-config.service';

jest.mock('meilisearch', () => ({
  MeiliSearch: jest.fn().mockImplementation(() => ({
    index: () => ({
      search: jest.fn().mockResolvedValue({
        hits: [],
        estimatedTotalHits: 0,
      }),
      updateSearchableAttributes: jest.fn(),
      updateFilterableAttributes: jest.fn(),
      updateSortableAttributes: jest.fn(),
    }),
  })),
}));

describe('MeilisearchService', () => {
  let service: MeilisearchService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeilisearchService,
        {
          provide: AppConfigService,
          useValue: {
            meilisearchHost: 'http://localhost:7700',
            meilisearchApiKey: 'test-key',
            meilisearchIndex: 'works',
          },
        },
      ],
    }).compile();

    service = module.get<MeilisearchService>(MeilisearchService);
  });

  it('search returns shape with hits, total, offset, limit', async () => {
    const result = await service.search('test', { limit: 5, offset: 0 });
    expect(result).toHaveProperty('hits');
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('offset');
    expect(result).toHaveProperty('limit');
    expect(Array.isArray(result.hits)).toBe(true);
    expect(result.limit).toBe(5);
    expect(result.offset).toBe(0);
  });
});
