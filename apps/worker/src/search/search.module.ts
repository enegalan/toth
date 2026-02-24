import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Work } from '@toth/database';
import { SearchIndexService } from './search-index.service';

@Module({
  imports: [TypeOrmModule.forFeature([Work])],
  providers: [SearchIndexService],
  exports: [SearchIndexService],
})
export class SearchModule {}
