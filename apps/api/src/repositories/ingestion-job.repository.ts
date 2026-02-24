import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IngestionJob, IngestionJobStatus } from '@toth/database';

@Injectable()
export class IngestionJobRepository {
  constructor(
    @InjectRepository(IngestionJob)
    private readonly repo: Repository<IngestionJob>,
  ) {}

  async create(sourceId: string): Promise<IngestionJob> {
    return this.repo.save(
      this.repo.create({ source_id: sourceId, status: 'pending' }),
    );
  }

  async findById(id: string): Promise<IngestionJob | null> {
    return this.repo.findOne({ where: { id }, relations: ['source'] });
  }

  async findByIdOrFail(id: string): Promise<IngestionJob> {
    const job = await this.findById(id);
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return job;
  }

  async updateStatus(
    id: string,
    status: IngestionJobStatus,
    errorMessage?: string | null,
  ): Promise<void> {
    const update: Partial<IngestionJob> = { status };
    if (status === 'running') {
      update.started_at = new Date();
    }
    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      update.completed_at = new Date();
    }
    if (errorMessage !== undefined) {
      update.error_message = errorMessage;
    }
    await this.repo.update(id, update);
  }

  async findLatestBySourceId(sourceId: string): Promise<IngestionJob | null> {
    return this.repo.findOne({
      where: { source_id: sourceId },
      order: { created_at: 'DESC' },
    });
  }
}
