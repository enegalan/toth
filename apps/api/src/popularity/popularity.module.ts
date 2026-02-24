import { Module } from '@nestjs/common';
import { RepositoriesModule } from '../repositories/repositories.module';
import { SearchModule } from '../search/search.module';
import { PopularityService } from './popularity.service';

@Module({
  imports: [RepositoriesModule, SearchModule],
  providers: [PopularityService],
  exports: [PopularityService],
})
export class PopularityModule {}
