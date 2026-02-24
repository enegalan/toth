import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TakedownRequest } from '@toth/database';
import { TakedownController } from './takedown.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TakedownRequest])],
  controllers: [TakedownController],
})
export class TakedownModule {}
