import { Module } from '@nestjs/common';
import { RepositoriesModule } from '../repositories/repositories.module';
import { AuthorsController } from './authors.controller';

@Module({
  imports: [RepositoriesModule],
  controllers: [AuthorsController],
})
export class AuthorsModule {}
