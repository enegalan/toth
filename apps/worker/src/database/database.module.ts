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
import { AppConfigService } from '../config/app-config.service';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        type: 'postgres',
        url: config.databaseUrl,
        entities: [Author, Edition, IngestionJob, IngestionJobEvent, Source, Work],
        synchronize: false,
        logging: false,
      }),
    }),
    TypeOrmModule.forFeature([
      Author,
      Edition,
      IngestionJob,
      IngestionJobEvent,
      Source,
      Work,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
