import { Module } from '@nestjs/common';
import { MeilisearchService } from './meilisearch.service';
import { SearchController } from './search.controller';
import { RepositoriesModule } from '../repositories/repositories.module';

@Module({
  imports: [RepositoriesModule],
  controllers: [SearchController],
  providers: [MeilisearchService],
  exports: [MeilisearchService],
})
export class SearchModule {}
