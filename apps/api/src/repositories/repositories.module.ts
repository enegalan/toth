import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import {
  AuthorRepository,
  EditionRepository,
  IngestionJobRepository,
  SavedWorkRepository,
  SessionRepository,
  SourceRepository,
  UserRepository,
  WorkRepository,
  WorkRatingRepository,
} from './index';

@Module({
  imports: [DatabaseModule],
  providers: [
    AuthorRepository,
    EditionRepository,
    IngestionJobRepository,
    SavedWorkRepository,
    SessionRepository,
    SourceRepository,
    UserRepository,
    WorkRepository,
    WorkRatingRepository,
  ],
  exports: [
    AuthorRepository,
    EditionRepository,
    IngestionJobRepository,
    SavedWorkRepository,
    SessionRepository,
    SourceRepository,
    UserRepository,
    WorkRepository,
    WorkRatingRepository,
  ],
})
export class RepositoriesModule {}
