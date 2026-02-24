import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Author, Work } from '@toth/database';
import { DeduplicationService } from './deduplication.service';

@Module({
  imports: [TypeOrmModule.forFeature([Author, Work])],
  providers: [DeduplicationService],
  exports: [DeduplicationService],
})
export class DeduplicationModule {}
