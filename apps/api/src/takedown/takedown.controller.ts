import { Body, Controller, Post } from '@nestjs/common';
import { IsEmail, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TakedownRequest } from '@toth/database';

class TakedownIntakeDto {
  @IsEmail()
  claimant_email: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  reason: string;

  @IsOptional()
  @IsUUID()
  work_id?: string;

  @IsOptional()
  @IsUUID()
  edition_id?: string;
}

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
