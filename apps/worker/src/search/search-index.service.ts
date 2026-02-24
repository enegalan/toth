import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MeiliSearch } from 'meilisearch';
import type { WorkSearchDocument } from '@toth/shared';
import { Repository } from 'typeorm';
import { Work } from '@toth/database';
import { AppConfigService } from '../config/app-config.service';

@Injectable()
export class SearchIndexService {
  private client: MeiliSearch;
  private indexName: string;
  private indexEnsured = false;

  constructor(
    private readonly config: AppConfigService,
    @InjectRepository(Work)
    private readonly workRepo: Repository<Work>,
  ) {
    this.client = new MeiliSearch({
      host: this.config.meilisearchHost,
      apiKey: this.config.meilisearchApiKey || undefined,
    });
    this.indexName = this.config.meilisearchIndex;
  }

  private async ensureIndex(): Promise<void> {
    if (this.indexEnsured) return;
    try {
      await this.client.getRawIndex(this.indexName);
    } catch {
      const createTask = await this.client.createIndex(this.indexName, {
        primaryKey: 'id',
      });
      await this.client.waitForTask(createTask.taskUid, {
        timeOutMs: 5000,
        intervalMs: 200,
      });
    }
    this.indexEnsured = true;
  }

  async indexWork(workId: string): Promise<void> {
    const work = await this.workRepo.findOne({
      where: { id: workId },
      relations: ['author', 'editions', 'editions.source'],
    });
    if (!work) return;
    await this.ensureIndex();
    const doc = this.toDocument(work);
    const index = this.client.index(this.indexName);
    const enqueued = await index.addDocuments([doc], { primaryKey: 'id' });
    const task = await index.waitForTask(enqueued.taskUid, {
      timeOutMs: 10_000,
      intervalMs: 100,
    });
    if (task.status === 'failed') {
      throw new Error(
        `Meilisearch index task failed: ${task.error?.message ?? JSON.stringify(task.error)}`,
      );
    }
  }

  async deleteWork(workId: string): Promise<void> {
    const index = this.client.index(this.indexName);
    await index.deleteDocument(workId);
  }

  private toDocument(work: Work): WorkSearchDocument {
    const authorName = work.author?.canonical_name ?? 'Unknown';
    const editions = work.editions ?? [];
    const licenses = [...new Set(editions.map((e) => e.license))];
    const sourceIds = [...new Set(editions.map((e) => e.source_id))];
    const coverUrl =
      editions.map((e) => e.cover_url).find((u): u is string => !!u) ?? null;
    return {
      id: work.id,
      canonical_title: work.canonical_title,
      author_name: authorName,
      author_id: work.author_id,
      language: work.language,
      description: work.description ?? null,
      subjects: Array.isArray(work.subjects) ? work.subjects : [],
      licenses,
      source_ids: sourceIds,
      cover_url: coverUrl,
      popularity_score: Number(work.popularity_score),
      updated_at: new Date(work.updated_at).getTime(),
    };
  }
}
