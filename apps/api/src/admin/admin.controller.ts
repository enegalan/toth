import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { IngestionJob, IngestionJobEvent, Source } from '@toth/database';
import { AdminGuard } from '../auth/admin.guard';

@Controller('admin/ingestion')
@UseGuards(AdminGuard)
export class AdminIngestionController {
  constructor(
    @InjectRepository(Source)
    private readonly sourceRepo: Repository<Source>,
    @InjectRepository(IngestionJob)
    private readonly jobRepo: Repository<IngestionJob>,
    @InjectRepository(IngestionJobEvent)
    private readonly eventRepo: Repository<IngestionJobEvent>,
  ) {}

  @Post('trigger')
  async trigger(): Promise<{ created: number; message: string }> {
    const sources = await this.sourceRepo
      .createQueryBuilder('s')
      .where('s.connector_type IS NOT NULL')
      .andWhere('s.enabled = :enabled', { enabled: true })
      .getMany();

    let created = 0;
    for (const source of sources) {
      await this.jobRepo.update(
        { source_id: source.id, status: In(['pending', 'running']) },
        { status: 'cancelled', completed_at: new Date() },
      );
      await this.jobRepo.save(
        this.jobRepo.create({
          source_id: source.id,
          status: 'pending',
        }),
      );
      created += 1;
    }

    return {
      created,
      message:
        created > 0
          ? `Created ${created} ingestion job(s). The worker will process them shortly.`
          : 'No enabled sources with a connector.',
    };
  }

  @Get('jobs')
  async jobs(): Promise<{
    jobs: Array<{
      id: string;
      source_id: string;
      source_name: string;
      connector_type: string | null;
      status: string;
      started_at: string | null;
      completed_at: string | null;
      duration_seconds: number | null;
      error_message: string | null;
      created_at: string;
    }>;
  }> {
    const list = await this.jobRepo.find({
      relations: ['source'],
      order: { created_at: 'DESC' },
      take: 20,
    });
    return {
      jobs: list.map((j) => {
        const source = (j as IngestionJob & { source?: Source }).source;
        let duration_seconds: number | null = null;
        if (
          j.status === 'completed' &&
          j.started_at != null &&
          j.completed_at != null
        ) {
          duration_seconds = Math.round(
            (j.completed_at.getTime() - j.started_at.getTime()) / 1000,
          );
        }
        return {
          id: j.id,
          source_id: j.source_id,
          source_name: source?.name ?? '—',
          connector_type: source?.connector_type ?? null,
          status: j.status,
          started_at: j.started_at?.toISOString() ?? null,
          completed_at: j.completed_at?.toISOString() ?? null,
          duration_seconds,
          error_message: j.error_message,
          created_at: j.created_at.toISOString(),
        };
      }),
    };
  }

  @Get('jobs/:id')
  async jobById(
    @Param('id') id: string,
  ): Promise<{
    job: {
      id: string;
      source_id: string;
      source_name: string;
      status: string;
      started_at: string | null;
      completed_at: string | null;
      error_message: string | null;
      created_at: string;
    };
    events: Array<{
      id: string;
      event_type: string;
      message: string | null;
      detail: Record<string, unknown> | null;
      created_at: string;
    }>;
  }> {
    const job = await this.jobRepo.findOne({
      where: { id },
      relations: ['source'],
    });
    if (!job) throw new NotFoundException('Job not found');
    const events = await this.eventRepo.find({
      where: { job_id: id },
      order: { created_at: 'ASC' },
      take: 500,
    });
    return {
      job: {
        id: job.id,
        source_id: job.source_id,
        source_name: (job as IngestionJob & { source?: Source }).source?.name ?? '—',
        status: job.status,
        started_at: job.started_at?.toISOString() ?? null,
        completed_at: job.completed_at?.toISOString() ?? null,
        error_message: job.error_message,
        created_at: job.created_at.toISOString(),
      },
      events: events.map((e) => ({
        id: e.id,
        event_type: e.event_type,
        message: e.message,
        detail: e.detail,
        created_at: e.created_at.toISOString(),
      })),
    };
  }

  @Post('jobs/:id/cancel')
  async cancelJob(
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    const job = await this.jobRepo.findOne({ where: { id } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.status !== 'pending' && job.status !== 'running') {
      throw new BadRequestException(
        `Job cannot be cancelled (status: ${job.status})`,
      );
    }
    await this.jobRepo.update(id, {
      status: 'cancelled',
      completed_at: new Date(),
    });
    return { message: 'Ingestion job cancelled.' };
  }

  @Delete('jobs/:id')
  async deleteJob(@Param('id') id: string): Promise<{ message: string }> {
    const job = await this.jobRepo.findOne({ where: { id } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.status === 'pending' || job.status === 'running') {
      throw new BadRequestException(
        'Cannot delete job that is pending or running. Cancel it first.',
      );
    }
    await this.jobRepo.delete(id);
    return { message: 'Ingestion job deleted.' };
  }

  @Post('jobs/:id/retry')
  async retryJob(
    @Param('id') id: string,
  ): Promise<{ id: string; message: string }> {
    const job = await this.jobRepo.findOne({
      where: { id },
      relations: ['source'],
    });
    if (!job) throw new NotFoundException('Job not found');
    if (job.status === 'pending' || job.status === 'running') {
      throw new BadRequestException(
        'Cannot retry while job is pending or running. Cancel it first.',
      );
    }
    const source = (job as IngestionJob & { source?: Source }).source;
    if (!source?.connector_type) {
      throw new BadRequestException('Source has no connector; cannot retry.');
    }
    const existingPending = await this.jobRepo.findOne({
      where: { source_id: job.source_id, status: 'pending' },
    });
    const existingRunning = await this.jobRepo.findOne({
      where: { source_id: job.source_id, status: 'running' },
    });
    if (existingPending || existingRunning) {
      throw new BadRequestException(
        'This source already has a pending or running job.',
      );
    }
    const newJob = await this.jobRepo.save(
      this.jobRepo.create({
        source_id: job.source_id,
        status: 'pending',
      }),
    );
    return {
      id: newJob.id,
      message: 'New ingestion job created. The worker will process it shortly.',
    };
  }

  @Get('sources')
  async sources(): Promise<{
    sources: Array<{
      id: string;
      name: string;
      connector_type: string | null;
      base_url: string;
      enabled: boolean;
    }>;
  }> {
    const list = await this.sourceRepo.find({
      order: { name: 'ASC' },
    });
    return {
      sources: list.map((s) => ({
        id: s.id,
        name: s.name,
        connector_type: s.connector_type,
        base_url: s.base_url,
        enabled: s.enabled,
      })),
    };
  }

  @Post('sources/:id/trigger')
  async triggerSource(
    @Param('id') sourceId: string,
  ): Promise<{ created: boolean; jobId?: string; message: string }> {
    const source = await this.sourceRepo.findOne({ where: { id: sourceId } });
    if (!source) throw new NotFoundException('Source not found');
    if (!source.connector_type) {
      throw new BadRequestException('Source has no connector; cannot trigger ingestion.');
    }
    if (!source.enabled) {
      throw new BadRequestException('Source is disabled; enable it first to run ingestion.');
    }
    await this.jobRepo.update(
      { source_id: sourceId, status: In(['pending', 'running']) },
      { status: 'cancelled', completed_at: new Date() },
    );
    const job = await this.jobRepo.save(
      this.jobRepo.create({
        source_id: sourceId,
        status: 'pending',
      }),
    );
    return {
      created: true,
      jobId: job.id,
      message: 'Ingestion job created. The worker will process it shortly.',
    };
  }

  @Patch('sources/:id')
  async updateSource(
    @Param('id') sourceId: string,
    @Body() body: { enabled?: boolean },
  ): Promise<{ enabled: boolean; message: string }> {
    const source = await this.sourceRepo.findOne({ where: { id: sourceId } });
    if (!source) throw new NotFoundException('Source not found');
    if (typeof body.enabled !== 'boolean') {
      throw new BadRequestException('Body must include enabled (boolean).');
    }
    await this.sourceRepo.update(sourceId, { enabled: body.enabled });
    return {
      enabled: body.enabled,
      message: body.enabled ? 'Source enabled.' : 'Source disabled.',
    };
  }
}
