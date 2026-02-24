import { join } from 'path';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Author,
  Edition,
  IngestionJob,
  IngestionJobEvent,
  SavedWork,
  Session,
  Source,
  TakedownRequest,
  User,
  Work,
  WorkRating,
} from '@toth/database';
import { AppConfigService } from '../config/app-config.service';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        type: 'postgres',
        url: config.databaseUrl,
        entities: [
          Author,
          Edition,
          IngestionJob,
          IngestionJobEvent,
          SavedWork,
          Session,
          Source,
          TakedownRequest,
          User,
          Work,
          WorkRating,
        ],
        migrations: [join(__dirname, '..', 'migrations', '*.{ts,js}')],
        migrationsRun: false,
        synchronize: false,
        logging: config.nodeEnv === 'development',
      }),
    }),
    TypeOrmModule.forFeature([
      Author,
      Edition,
      IngestionJob,
      IngestionJobEvent,
      SavedWork,
      Session,
      Source,
      TakedownRequest,
      User,
      Work,
      WorkRating,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
