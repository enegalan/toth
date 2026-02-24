import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { ConnectorType } from '@toth/shared';
import { Repository } from 'typeorm';
import { IngestionJob, IngestionJobEvent, Source } from '@toth/database';
import { createConnector } from '../connectors/connector-registry';
import {
  logJobComplete,
  logJobFailed,
  logJobStart,
} from './ingestion.logger';
import { PipelineService } from './pipeline.service';

const PROGRESS_EVERY_N = 10;
const MAX_EVENTS_PER_JOB = 500;
const HEARTBEAT_INTERVAL_MS = 20000;
/** Max time per record (pipeline: DB + Meilisearch); skip record on timeout to avoid hanging. */
const PIPELINE_PROCESS_TIMEOUT_MS = 60000;

@Injectable()
export class IngestionService {
  constructor(
    @InjectRepository(IngestionJob)
    private readonly jobRepo: Repository<IngestionJob>,
    @InjectRepository(IngestionJobEvent)
    private readonly eventRepo: Repository<IngestionJobEvent>,
    @InjectRepository(Source)
    private readonly sourceRepo: Repository<Source>,
    private readonly pipeline: PipelineService,
  ) {}

  async runJob(jobId: string): Promise<void> {
    const job = await this.jobRepo.findOne({
      where: { id: jobId },
      relations: ['source'],
    });
    if (!job) throw new Error(`Job not found: ${jobId}`);
    if (job.status !== 'pending') return;

    const source = job.source;
    if (!source?.connector_type) {
      await this.jobRepo.update(jobId, {
        status: 'failed',
        completed_at: new Date(),
        error_message: 'Source has no connector_type',
      });
      return;
    }

    const updateResult = await this.jobRepo
      .createQueryBuilder()
      .update(IngestionJob)
      .set({ status: 'running', started_at: new Date() })
      .where('id = :id', { id: jobId })
      .andWhere('status = :status', { status: 'pending' })
      .execute();
    if ((updateResult.affected ?? 0) === 0) {
      return;
    }

    const startedAt = Date.now();
    logJobStart(jobId, source.id);
    await this.emitEvent(jobId, 'started', `Ingestion started for source ${source.name}`, { source_name: source.name });

    const CANCELLATION_CHECK_INTERVAL = 50;

    try {
      const connector = createConnector(
        source.connector_type as ConnectorType,
        source.id,
      );
      let count = 0;
      let indexFailures = 0;
      let lastIndexError: string | null = null;
      let cancelled = false;
      let lastTitle: string | null = null;
      const heartbeat = setInterval(async () => {
        const current = await this.jobRepo.findOne({
          where: { id: jobId },
          select: ['status'],
        });
        if (current?.status !== 'running') return;
        await this.emitEvent(
          jobId,
          'progress',
          count > 0
            ? `Still scanning… ${count} records so far, last: ${lastTitle ?? '—'}`
            : 'Still scanning…',
          { count, last_title: lastTitle },
        );
      }, HEARTBEAT_INTERVAL_MS);
      try {
        for await (const record of connector.fetchCatalog()) {
          if (count > 0 && count % CANCELLATION_CHECK_INTERVAL === 0) {
            const current = await this.jobRepo.findOne({
              where: { id: jobId },
              select: ['status'],
            });
            if (current?.status === 'cancelled') {
              cancelled = true;
              break;
            }
          }
          let result: Awaited<ReturnType<PipelineService['process']>> | null = null;
          try {
            result = await Promise.race([
              this.pipeline.process(record),
              new Promise<never>((_, reject) =>
                setTimeout(
                  () => reject(new Error('Pipeline process timeout')),
                  PIPELINE_PROCESS_TIMEOUT_MS,
                ),
              ),
            ]);
          } catch (err) {
            indexFailures += 1;
            lastIndexError =
              err instanceof Error ? err.message : String(err);
          }
          if (result && 'indexError' in result && result.indexError) {
            indexFailures += 1;
            lastIndexError = result.indexError.message;
          }
          count += 1;
          lastTitle = record.title ?? null;
          if (count === 1 || count % PROGRESS_EVERY_N === 0) {
            const msg =
              count === 1
                ? `Scraped: ${lastTitle ?? '—'}`
                : `${count} records, last: ${lastTitle ?? '—'}`;
            await this.emitEvent(jobId, 'progress', msg, {
              count,
              last_title: lastTitle,
            });
          }
        }
      } finally {
        clearInterval(heartbeat);
      }
      if (cancelled) {
        await this.emitEvent(jobId, 'cancelled', `Cancelled after ${count} records`, { count });
        await this.jobRepo.update(jobId, {
          status: 'cancelled',
          completed_at: new Date(),
          error_message: null,
        });
      } else {
        const completedMsg =
          indexFailures > 0
            ? `Completed: ${count} records processed, ${indexFailures} failed to index to search`
            : `Completed: ${count} records indexed`;
        await this.emitEvent(jobId, 'completed', completedMsg, {
          count,
          index_failures: indexFailures,
          index_error_sample: lastIndexError ?? undefined,
          duration_ms: Date.now() - startedAt,
        });
        await this.jobRepo.update(jobId, {
          status: 'completed',
          completed_at: new Date(),
          error_message: null,
        });
        logJobComplete(jobId, source.id, count, Date.now() - startedAt);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await this.emitEvent(jobId, 'failed', message, { error: message });
      await this.jobRepo.update(jobId, {
        status: 'failed',
        completed_at: new Date(),
        error_message: message,
      });
      logJobFailed(jobId, source.id, message);
      throw err;
    }
  }

  private async emitEvent(
    jobId: string,
    eventType: string,
    message: string | null,
    detail: Record<string, unknown> | null = null,
  ): Promise<void> {
    await this.eventRepo.save(
      this.eventRepo.create({
        job_id: jobId,
        event_type: eventType,
        message,
        detail: detail ?? undefined,
      }),
    );
    await this.pruneEvents(jobId);
  }

  private async pruneEvents(jobId: string): Promise<void> {
    const all = await this.eventRepo.find({
      where: { job_id: jobId },
      select: ['id'],
      order: { created_at: 'ASC' },
    });
    if (all.length <= MAX_EVENTS_PER_JOB) return;
    const toDelete = all
      .slice(0, all.length - MAX_EVENTS_PER_JOB)
      .map((e) => e.id);
    await this.eventRepo.delete(toDelete);
  }

  async createJobForSource(sourceId: string): Promise<IngestionJob | null> {
    const existing = await this.jobRepo.findOne({
      where: { source_id: sourceId, status: 'pending' },
    });
    if (existing) return null;
    const running = await this.jobRepo.findOne({
      where: { source_id: sourceId, status: 'running' },
    });
    if (running) return null;
    const job = this.jobRepo.create({
      source_id: sourceId,
      status: 'pending',
    });
    return this.jobRepo.save(job);
  }

  async getPendingJobIds(): Promise<string[]> {
    const jobs = await this.jobRepo.find({
      where: { status: 'pending' },
      relations: ['source'],
      select: ['id', 'source_id'],
      take: 10,
    });
    return jobs
      .filter((j) => (j as { source?: { enabled?: boolean } }).source?.enabled !== false)
      .map((j) => j.id);
  }
}
