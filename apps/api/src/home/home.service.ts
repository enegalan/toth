import { Injectable } from '@nestjs/common';
import { MeilisearchService } from '../search/meilisearch.service';
import { WorkRepository } from '../repositories/work.repository';
import { WorkSummaryDto } from '../works/work.dto';

const POPULAR_LIMIT = 12;
const RECENT_LIMIT = 12;
const SUBJECTS_LIMIT = 8;
const WORKS_PER_SUBJECT = 6;

export interface HomeResponse {
  popular: WorkSummaryDto[];
  recent: WorkSummaryDto[];
  bySubject: Array<{ subject: string; works: WorkSummaryDto[] }>;
}

@Injectable()
export class HomeService {
  constructor(
    private readonly meilisearch: MeilisearchService,
    private readonly workRepo: WorkRepository,
  ) {}

  async getHome(): Promise<HomeResponse> {
    const [popular, recent, subjects] = await Promise.all([
      this.meilisearch.search('', {
        limit: POPULAR_LIMIT,
        offset: 0,
        sort: ['popularity_score:desc'],
      }),
      this.meilisearch.search('', {
        limit: RECENT_LIMIT,
        offset: 0,
        sort: ['updated_at:desc'],
      }),
      this.workRepo.findTopSubjects(SUBJECTS_LIMIT),
    ]);

    const bySubject: Array<{ subject: string; works: WorkSummaryDto[] }> = [];
    for (const subject of subjects) {
      const escaped = subject.replace(/"/g, '\\"');
      const result = await this.meilisearch.search('', {
        limit: WORKS_PER_SUBJECT,
        offset: 0,
        filter: `subjects = "${escaped}"`,
        sort: ['popularity_score:desc'],
      });
      bySubject.push({
        subject,
        works: result.hits.map(WorkSummaryDto.from),
      });
    }

    return {
      popular: popular.hits.map(WorkSummaryDto.from),
      recent: recent.hits.map(WorkSummaryDto.from),
      bySubject,
    };
  }
}
