import { Controller, Get, Query } from '@nestjs/common';
import { MeilisearchService } from './meilisearch.service';
import { SearchQueryDto, SubjectsQueryDto } from './search.dto';
import { WorkSummaryDto } from '../works/work.dto';
import { WorkRepository } from '../repositories/work.repository';

@Controller('search')
export class SearchController {
  constructor(
    private readonly meilisearch: MeilisearchService,
    private readonly workRepo: WorkRepository,
  ) {}

  @Get()
  async search(@Query() query: SearchQueryDto) {
    const filterParts: string[] = [];
    if (query.language) {
      filterParts.push(`language = "${query.language.replace(/"/g, '\\"')}"`);
    }
    if (query.license) {
      filterParts.push(`licenses = "${query.license.replace(/"/g, '\\"')}"`);
    }
    if (query.subject) {
      filterParts.push(`subjects = "${query.subject.replace(/"/g, '\\"')}"`);
    }
    if (query.author_id) {
      filterParts.push(`author_id = "${query.author_id}"`);
    }
    if (query.source_id) {
      filterParts.push(`source_ids = "${query.source_id}"`);
    }
    if (query.public_domain === true) {
      filterParts.push('licenses = "public-domain"');
    }
    const filter = filterParts.length ? filterParts.join(' AND ') : undefined;
    const result = await this.meilisearch.search(query.q ?? '', {
      limit: query.limit ?? 20,
      offset: query.offset ?? 0,
      filter,
      sort: ['popularity_score:desc', 'updated_at:desc'],
    });
    const summaries = result.hits.map(WorkSummaryDto.from);
    return {
      total: result.total,
      offset: result.offset,
      limit: result.limit,
      works: summaries,
    };
  }

  @Get('subjects')
  async subjects(@Query() query: SubjectsQueryDto) {
    const limit = query.limit ?? 200;
    try {
      return await this.meilisearch.getSubjectFacets(limit);
    } catch {
      return this.workRepo.findSubjects(limit);
    }
  }
}
