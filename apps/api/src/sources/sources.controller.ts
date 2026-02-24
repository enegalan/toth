import { Controller, Get } from '@nestjs/common';
import { SourceRepository } from '../repositories/source.repository';
import { SourceDto } from './source.dto';

@Controller('sources')
export class SourcesController {
  constructor(private readonly sourceRepo: SourceRepository) {}

  @Get()
  async findAll(): Promise<SourceDto[]> {
    const sources = await this.sourceRepo.findAll();
    return sources.map(SourceDto.from);
  }
}
