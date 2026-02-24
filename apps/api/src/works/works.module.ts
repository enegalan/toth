import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RepositoriesModule } from '../repositories/repositories.module';
import { WorksController } from './works.controller';
import { WorksRatingsController } from './works-ratings.controller';

@Module({
  imports: [AuthModule, RepositoriesModule],
  controllers: [WorksController, WorksRatingsController],
})
export class WorksModule {}
