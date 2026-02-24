import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Edition, IngestionJob, IngestionJobEvent, Source, Work } from '@toth/database';
import { DeduplicationModule } from '../deduplication/deduplication.module';
import { NormalizationModule } from '../normalization/normalization.module';
import { SearchModule } from '../search/search.module';
import { IngestionService } from './ingestion.service';
import { PipelineService } from './pipeline.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IngestionJob,
      IngestionJobEvent,
      Source,
      Edition,
      Work,
    ]),
    NormalizationModule,
    DeduplicationModule,
    SearchModule,
  ],
  providers: [IngestionService, PipelineService],
  exports: [IngestionService],
})
export class IngestionModule {}
