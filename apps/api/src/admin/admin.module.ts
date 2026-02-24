import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Author,
  Edition,
  IngestionJob,
  IngestionJobEvent,
  Source,
  Work,
} from '@toth/database';
import { AdminIngestionController } from './admin.controller';
import { AdminSearchController } from './admin-search.controller';
import { AdminStatsController } from './admin-stats.controller';
import { AdminStatsService } from './admin-stats.service';
import { AuthModule } from '../auth/auth.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      Author,
      Edition,
      IngestionJob,
      IngestionJobEvent,
      Source,
      Work,
    ]),
    SearchModule,
  ],
  controllers: [
    AdminIngestionController,
    AdminSearchController,
    AdminStatsController,
  ],
  providers: [AdminStatsService],
})
export class AdminModule {}
