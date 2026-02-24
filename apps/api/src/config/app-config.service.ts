import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  get port(): number {
    return this.config.get<number>('PORT', 3001);
  }

  get nodeEnv(): string {
    return this.config.get<string>('NODE_ENV', 'development');
  }

  get databaseUrl(): string {
    const url = this.config.get<string>('DATABASE_URL');
    if (!url) {
      throw new Error('DATABASE_URL is required');
    }
    return url;
  }

  get redisUrl(): string {
    return this.config.get<string>('REDIS_URL', 'redis://localhost:6379');
  }

  get meilisearchHost(): string {
    return this.config.get<string>('MEILISEARCH_HOST', 'http://localhost:7700');
  }

  get meilisearchApiKey(): string {
    return this.config.get<string>('MEILISEARCH_API_KEY', '');
  }

  get meilisearchIndex(): string {
    return this.config.get<string>('MEILISEARCH_INDEX', 'works');
  }
}
