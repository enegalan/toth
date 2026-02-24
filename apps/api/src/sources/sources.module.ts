import { Module } from '@nestjs/common';
import { RepositoriesModule } from '../repositories/repositories.module';
import { SourcesController } from './sources.controller';

@Module({
  imports: [RepositoriesModule],
  controllers: [SourcesController],
})
export class SourcesModule {}
