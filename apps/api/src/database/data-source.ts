import { join } from 'path';
import { DataSource } from 'typeorm';
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

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  return url;
}

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: getDatabaseUrl(),
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
  logging: process.env.NODE_ENV === 'development',
});
