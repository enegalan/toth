import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SUPPORTED_LICENSES, type RawEditionRecord } from '@toth/shared';
import { Repository } from 'typeorm';
import { Edition, Work } from '@toth/database';
import { DeduplicationService } from '../deduplication/deduplication.service';
import { NormalizationService } from '../normalization/normalization.service';
import { SearchIndexService } from '../search/search-index.service';

export interface ProcessResult {
  workId: string;
  indexError?: Error;
}

@Injectable()
export class PipelineService {
  private readonly logger = new Logger(PipelineService.name);

  constructor(
    @InjectRepository(Edition)
    private readonly editionRepo: Repository<Edition>,
    @InjectRepository(Work)
    private readonly workRepo: Repository<Work>,
    private readonly normalization: NormalizationService,
    private readonly dedup: DeduplicationService,
    private readonly searchIndex: SearchIndexService,
  ) {}

  async process(record: RawEditionRecord): Promise<ProcessResult | void> {
    const normalized = this.normalization.normalize(record);
    const licenseOk = SUPPORTED_LICENSES.includes(
      normalized.license as (typeof SUPPORTED_LICENSES)[number],
    );
    if (!licenseOk) return;
    const { authorId, confidence: authorConf } =
      await this.dedup.resolveAuthor(normalized.authors);
    const { workId, confidence: workConf } = await this.dedup.resolveWork(
      normalized,
      authorId,
    );
    const confidence = Math.min(authorConf, workConf);
    await this.findOrCreateEdition(workId, normalized, confidence);
    try {
      await this.searchIndex.indexWork(workId);
      return { workId };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.warn(
        `Failed to index work to search: ${workId} — ${error.message}. Check MEILISEARCH_HOST and MEILISEARCH_API_KEY (must match Meilisearch master key).`,
      );
      return { workId, indexError: error };
    }
  }

  private async findOrCreateEdition(
    workId: string,
    normalized: {
      source_id: string;
      title: string;
      license: string;
      download_url: string;
      cover_url: string | null;
      file_size: number | null;
      description: string | null;
      subjects: string[];
    },
    confidence: number,
  ): Promise<Edition> {
    const downloadUrl = normalized.download_url.slice(0, 2048);
    const existing = await this.editionRepo.findOne({
      where: {
        work_id: workId,
        source_id: normalized.source_id,
        download_url: downloadUrl,
      },
    });
    if (existing) {
      existing.cover_url = normalized.cover_url?.slice(0, 2048) ?? existing.cover_url;
      existing.quality_score = confidence as unknown as typeof existing.quality_score;
      if (normalized.file_size != null) existing.file_size = normalized.file_size;
      await this.editionRepo.save(existing);
      const workUpdate: Partial<Work> = {};
      if (normalized.title) {
        workUpdate.canonical_title = normalized.title.slice(0, 1000);
      }
      if (normalized.description != null) {
        workUpdate.description = normalized.description.slice(0, 10000);
      }
      if (normalized.subjects?.length) {
        workUpdate.subjects = normalized.subjects.slice(0, 500);
      }
      if (Object.keys(workUpdate).length > 0) {
        await this.workRepo.update(workId, workUpdate);
      }
      return existing;
    }
    const edition = this.editionRepo.create({
      work_id: workId,
      source_id: normalized.source_id,
      license: normalized.license.slice(0, 100),
      download_url: downloadUrl,
      cover_url: normalized.cover_url?.slice(0, 2048) ?? null,
      file_size: normalized.file_size,
      quality_score: confidence,
    });
    const saved = await this.editionRepo.save(edition);
    if (normalized.title) {
      await this.workRepo.update(workId, {
        canonical_title: normalized.title.slice(0, 1000),
      });
    }
    return saved;
  }
}
