import { Body, Controller, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TakedownRequest } from '@toth/database';
import { TakedownIntakeDto } from './takedown.dto';

@Controller('takedown')
export class TakedownController {
  constructor(
    @InjectRepository(TakedownRequest)
    private readonly repo: Repository<TakedownRequest>,
  ) {}

  @Post()
  async intake(@Body() dto: TakedownIntakeDto): Promise<{ id: string; status: string }> {
    const request = this.repo.create({
      claimant_email: dto.claimant_email,
      reason: dto.reason,
      work_id: dto.work_id ?? null,
      edition_id: dto.edition_id ?? null,
      status: 'pending',
    });
    const saved = await this.repo.save(request);
    return { id: saved.id, status: saved.status };
  }
}
