import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { MeilisearchService } from '../search/meilisearch.service';

@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource()
    private readonly db: DataSource,
    private readonly meilisearch: MeilisearchService,
  ) {}

  @Get()
  async check(): Promise<{
    status: 'ok' | 'degraded';
    database: 'up' | 'down';
    search: 'up' | 'down';
  }> {
    let database: 'up' | 'down' = 'down';
    let search: 'up' | 'down' = 'down';

    try {
      await this.db.query('SELECT 1');
      database = 'up';
    } catch {
      database = 'down';
    }

    try {
      search = (await this.meilisearch.ping()) ? 'up' : 'down';
    } catch {
      search = 'down';
    }

    const status = database === 'up' && search === 'up' ? 'ok' : 'degraded';
    return { status, database, search };
  }
}
