import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AdminModule } from './admin/admin.module';
import { AppConfigModule } from './config/app-config.module';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { HomeModule } from './home/home.module';
import { MeModule } from './me/me.module';
import { RepositoriesModule } from './repositories/repositories.module';
import { SearchModule } from './search/search.module';
import { AuthorsModule } from './authors/authors.module';
import { SourcesModule } from './sources/sources.module';
import { TakedownModule } from './takedown/takedown.module';
import { WorksModule } from './works/works.module';
import { PopularityModule } from './popularity/popularity.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env.local', '.env'] }),
    ScheduleModule.forRoot(),
    AppConfigModule,
    AuthModule,
    DatabaseModule,
    AdminModule,
    RepositoriesModule,
    HealthModule,
    HomeModule,
    MeModule,
    SearchModule,
    WorksModule,
    AuthorsModule,
    SourcesModule,
    TakedownModule,
    PopularityModule,
  ],
})
export class AppModule {}
