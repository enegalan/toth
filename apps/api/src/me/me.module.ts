import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MeController } from './me.controller';
import { RepositoriesModule } from '../repositories/repositories.module';

@Module({
  imports: [AuthModule, RepositoriesModule],
  controllers: [MeController],
})
export class MeModule {}
