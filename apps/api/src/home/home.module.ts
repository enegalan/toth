import { Module } from '@nestjs/common';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';
import { RepositoriesModule } from '../repositories/repositories.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [RepositoriesModule, SearchModule],
  controllers: [HomeController],
  providers: [HomeService],
})
export class HomeModule {}
