import { Injectable } from '@nestjs/common';
import { MeiliSearch } from 'meilisearch';
import type { WorkSearchDocument } from '@toth/shared';
import { AppConfigService } from '../config/app-config.service';

export interface SearchResult {
  hits: WorkSearchDocument[];
  total: number;
  offset: number;
  limit: number;
}

@Injectable()
export class MeilisearchService {
  private client: MeiliSearch;
  private indexName: string;

  constructor(private readonly config: AppConfigService) {
    this.client = new MeiliSearch({
      host: this.config.meilisearchHost,
      apiKey: this.config.meilisearchApiKey || undefined,
    });
    this.indexName = this.config.meilisearchIndex;
  }

  async ping(): Promise<boolean> {
    try {
      const res = await fetch(`${this.config.meilisearchHost.replace(/\/$/, '')}/health`);
      return res.ok;
    } catch {
      return false;
    }
  }

  async ensureIndex(): Promise<void> {
    const index = this.client.index(this.indexName);
    await index.updateSearchableAttributes([
      'canonical_title',
      'author_name',
      'description',
      'subjects',
    ]);
    const filterTask = await index.updateFilterableAttributes([
      'language',
      'licenses',
      'source_ids',
      'author_id',
      'subjects',
    ]);
    await index.waitForTask(filterTask.taskUid, {
      timeOutMs: 5000,
      intervalMs: 100,
    });
    await index.updateSortableAttributes([
      'popularity_score',
      'updated_at',
    ]);
  }

  async search(
    q: string,
    opts: {
      limit?: number;
      offset?: number;
      filter?: string;
      sort?: string[];
    } = {},
  ): Promise<SearchResult> {
    await this.ensureIndex();
    const index = this.client.index(this.indexName);
    const limit = opts.limit ?? 20;
    const offset = opts.offset ?? 0;
    const query = (q ?? '').trim();

    if (!query && !opts.filter) {
      return this.browseDocuments(index, {
        limit,
        offset,
        sort: opts.sort,
      });
    }

    const res = await index.search(query, {
      limit,
      offset,
      filter: opts.filter,
      sort: opts.sort,
    });
    return {
      hits: res.hits as WorkSearchDocument[],
      total: res.estimatedTotalHits ?? res.hits.length,
      offset,
      limit,
    };
  }

  private async browseDocuments(
    index: ReturnType<MeiliSearch['index']>,
    opts: { limit: number; offset: number; sort?: string[] },
  ): Promise<SearchResult> {
    const { limit, offset, sort } = opts;
    const res = await index.getDocuments({
      limit,
      offset,
      fields: [
        'id',
        'canonical_title',
        'author_name',
        'author_id',
        'language',
        'description',
        'subjects',
        'licenses',
        'source_ids',
        'cover_url',
        'popularity_score',
        'updated_at',
      ],
    });
    let hits = (res.results as WorkSearchDocument[]) ?? [];
    const total = res.total ?? hits.length;
    if (sort?.length) {
      const [sortAttr, order] = (sort[0] ?? '').split(':');
      if (sortAttr && order) {
        const desc = order === 'desc';
        hits = [...hits].sort((a, b) => {
          const va = (a as unknown as Record<string, unknown>)[sortAttr] as number;
          const vb = (b as unknown as Record<string, unknown>)[sortAttr] as number;
          return desc ? (vb ?? 0) - (va ?? 0) : (va ?? 0) - (vb ?? 0);
        });
      }
    }
    return { hits, total, offset, limit };
  }

  async indexDocument(doc: WorkSearchDocument): Promise<void> {
    const index = this.client.index(this.indexName);
    await index.addDocuments([doc]);
  }

  async updatePopularityScores(
    updates: Array<{ id: string; popularity_score: number }>,
  ): Promise<void> {
    if (updates.length === 0) return;
    const index = this.client.index(this.indexName);
    const docs = updates.map((u) => ({
      id: u.id,
      popularity_score: u.popularity_score,
    }));
    await index.updateDocuments(docs);
  }

  async deleteDocument(workId: string): Promise<void> {
    const index = this.client.index(this.indexName);
    await index.deleteDocument(workId);
  }

  async clearIndex(): Promise<{ taskUid: number }> {
    const index = this.client.index(this.indexName);
    const task = await index.deleteAllDocuments();
    return { taskUid: task.taskUid };
  }

  async getSubjectFacets(limit: number = 200): Promise<string[]> {
    await this.ensureIndex();
    const index = this.client.index(this.indexName);
    const res = await index.search('', {
      limit: 0,
      facets: ['subjects'],
    });
    const facetDistribution = (res as { facetDistribution?: { subjects?: Record<string, number> } }).facetDistribution;
    const distribution = facetDistribution?.subjects;
    if (!distribution || typeof distribution !== 'object') {
      return [];
    }
    const entries = Object.entries(distribution)
      .filter(([, count]) => count > 0)
      .sort(([, a], [, b]) => b - a);
    return entries.slice(0, limit).map(([subject]) => subject);
  }
}
