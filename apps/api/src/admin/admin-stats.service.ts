import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Author,
  Edition,
  IngestionJob,
  Source,
  Work,
} from '@toth/database';

const MAX_RANGE_DAYS = 365;
const DEFAULT_RANGE_DAYS = 30;

export type GroupBy = 'day' | 'week' | 'month';

export interface StatsSummary {
  worksCount: number;
  authorsCount: number;
  editionsCount: number;
  sourcesCount: number;
  jobsByStatus: {
    pending: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
  };
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface JobsTimeSeriesPoint {
  date: string;
  created: number;
  completed: number;
  failed: number;
}

export interface CatalogTimeSeriesPoint {
  date: string;
  works: number;
  editions: number;
}

export interface ConnectorDurationPoint {
  connectorType: string;
  avgDurationSeconds: number;
  jobCount: number;
}

export interface StatsResponse {
  summary: StatsSummary;
  jobsTimeSeries: JobsTimeSeriesPoint[];
  catalogTimeSeries: CatalogTimeSeriesPoint[];
  connectorDurations: ConnectorDurationPoint[];
}

@Injectable()
export class AdminStatsService {
  constructor(
    @InjectRepository(Work)
    private readonly workRepo: Repository<Work>,
    @InjectRepository(Author)
    private readonly authorRepo: Repository<Author>,
    @InjectRepository(Edition)
    private readonly editionRepo: Repository<Edition>,
    @InjectRepository(Source)
    private readonly sourceRepo: Repository<Source>,
    @InjectRepository(IngestionJob)
    private readonly jobRepo: Repository<IngestionJob>,
  ) {}

  async getStats(params: {
    from?: string;
    to?: string;
    groupBy?: GroupBy;
    sourceId?: string;
  }): Promise<StatsResponse> {
    const { from, to } = this.normalizeDateRange(params.from, params.to);
    const groupBy = params.groupBy ?? 'day';
    const sourceId = params.sourceId ?? null;

    const [summary, jobsTimeSeries, catalogTimeSeries, connectorDurations] =
      await Promise.all([
        this.getSummary(sourceId),
        this.getJobsTimeSeries(from, to, groupBy, sourceId),
        this.getCatalogTimeSeries(from, to, groupBy),
        this.getConnectorDurations(sourceId),
      ]);

    return {
      summary,
      jobsTimeSeries,
      catalogTimeSeries,
      connectorDurations,
    };
  }

  private async getConnectorDurations(
    sourceId: string | null,
  ): Promise<ConnectorDurationPoint[]> {
    const qb = this.jobRepo
      .createQueryBuilder('j')
      .innerJoin('j.source', 's')
      .select('s.connector_type', 'connectorType')
      .addSelect(
        'AVG(EXTRACT(EPOCH FROM (j.completed_at - j.started_at)))',
        'avgSeconds',
      )
      .addSelect('COUNT(*)', 'jobCount')
      .where('j.status = :status', { status: 'completed' })
      .andWhere('j.started_at IS NOT NULL')
      .andWhere('j.completed_at IS NOT NULL')
      .andWhere('s.connector_type IS NOT NULL')
      .groupBy('s.connector_type');

    if (sourceId) {
      qb.andWhere('j.source_id = :sourceId', { sourceId });
    }

    const rows = await qb.getRawMany<{
      connectorType: string;
      avgSeconds: string;
      jobCount: string;
    }>();

    return rows.map((row) => ({
      connectorType: row.connectorType,
      avgDurationSeconds: parseFloat(row.avgSeconds),
      jobCount: parseInt(row.jobCount, 10),
    }));
  }

  private normalizeDateRange(
    fromStr?: string,
    toStr?: string,
  ): { from: Date; to: Date } {
    const to = toStr ? new Date(toStr) : new Date();
    if (isNaN(to.getTime())) {
      const now = new Date();
      return this.defaultRange(now);
    }
    let from: Date;
    if (fromStr) {
      from = new Date(fromStr);
      if (isNaN(from.getTime())) from = this.offsetDays(to, -DEFAULT_RANGE_DAYS);
    } else {
      from = this.offsetDays(to, -DEFAULT_RANGE_DAYS);
    }
    const maxFrom = this.offsetDays(to, -MAX_RANGE_DAYS);
    if (from < maxFrom) from = maxFrom;
    if (from > to) from = this.offsetDays(to, -1);
    return { from, to };
  }

  private defaultRange(to: Date): { from: Date; to: Date } {
    return {
      from: this.offsetDays(to, -DEFAULT_RANGE_DAYS),
      to,
    };
  }

  private offsetDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  private async getSummary(sourceId: string | null): Promise<StatsSummary> {
    const [worksCount, authorsCount, editionsCount, sourcesCount, jobsByStatus] =
      await Promise.all([
        this.workRepo.count(),
        this.authorRepo.count(),
        this.editionRepo.count(),
        this.sourceRepo.count(),
        this.getJobsByStatus(sourceId),
      ]);

    return {
      worksCount,
      authorsCount,
      editionsCount,
      sourcesCount,
      jobsByStatus,
    };
  }

  private async getJobsByStatus(sourceId: string | null): Promise<StatsSummary['jobsByStatus']> {
    const qb = this.jobRepo
      .createQueryBuilder('j')
      .select('j.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('j.status');

    if (sourceId) {
      qb.andWhere('j.source_id = :sourceId', { sourceId });
    }

    const rows = await qb.getRawMany<{ status: string; count: string }>();
    const map = new Map<string, number>();
    for (const row of rows) {
      map.set(row.status, parseInt(row.count, 10));
    }
    return {
      pending: map.get('pending') ?? 0,
      running: map.get('running') ?? 0,
      completed: map.get('completed') ?? 0,
      failed: map.get('failed') ?? 0,
      cancelled: map.get('cancelled') ?? 0,
    };
  }

  private getDateTrunc(groupBy: GroupBy): string {
    switch (groupBy) {
      case 'week':
        return 'week';
      case 'month':
        return 'month';
      default:
        return 'day';
    }
  }

  private async getJobsTimeSeries(
    from: Date,
    to: Date,
    groupBy: GroupBy,
    sourceId: string | null,
  ): Promise<JobsTimeSeriesPoint[]> {
    const trunc = this.getDateTrunc(groupBy);
    const fromIso = from.toISOString();
    const toIso = to.toISOString();

    const createdQb = this.jobRepo
      .createQueryBuilder('j')
      .select(`date_trunc('${trunc}', j.created_at AT TIME ZONE 'UTC')`, 'bucket')
      .addSelect('COUNT(*)', 'count')
      .where('j.created_at >= :from', { from: fromIso })
      .andWhere('j.created_at <= :to', { to: toIso })
      .groupBy('bucket')
      .orderBy('bucket', 'ASC');

    const completedQb = this.jobRepo
      .createQueryBuilder('j')
      .select(
        `date_trunc('${trunc}', j.completed_at AT TIME ZONE 'UTC')`,
        'bucket',
      )
      .addSelect('COUNT(*)', 'count')
      .where('j.completed_at IS NOT NULL')
      .andWhere('j.completed_at >= :from', { from: fromIso })
      .andWhere('j.completed_at <= :to', { to: toIso })
      .andWhere('j.status = :status', { status: 'completed' })
      .groupBy('bucket')
      .orderBy('bucket', 'ASC');

    const failedQb = this.jobRepo
      .createQueryBuilder('j')
      .select(
        `date_trunc('${trunc}', j.completed_at AT TIME ZONE 'UTC')`,
        'bucket',
      )
      .addSelect('COUNT(*)', 'count')
      .where('j.completed_at IS NOT NULL')
      .andWhere('j.completed_at >= :from', { from: fromIso })
      .andWhere('j.completed_at <= :to', { to: toIso })
      .andWhere('j.status = :status', { status: 'failed' })
      .groupBy('bucket')
      .orderBy('bucket', 'ASC');

    if (sourceId) {
      createdQb.andWhere('j.source_id = :sourceId', { sourceId });
      completedQb.andWhere('j.source_id = :sourceId', { sourceId });
      failedQb.andWhere('j.source_id = :sourceId', { sourceId });
    }

    const [createdRows, completedRows, failedRows] = await Promise.all([
      createdQb.getRawMany<{ bucket: Date; count: string }>(),
      completedQb.getRawMany<{ bucket: Date; count: string }>(),
      failedQb.getRawMany<{ bucket: Date; count: string }>(),
    ]);

    const createdByDate = new Map<string, number>();
    for (const row of createdRows) {
      const key = new Date(row.bucket).toISOString();
      createdByDate.set(key, parseInt(row.count, 10));
    }
    const completedByDate = new Map<string, number>();
    for (const row of completedRows) {
      const key = new Date(row.bucket).toISOString();
      completedByDate.set(key, parseInt(row.count, 10));
    }
    const failedByDate = new Map<string, number>();
    for (const row of failedRows) {
      const key = new Date(row.bucket).toISOString();
      failedByDate.set(key, parseInt(row.count, 10));
    }

    const allBuckets = new Set<string>([
      ...createdByDate.keys(),
      ...completedByDate.keys(),
      ...failedByDate.keys(),
    ]);
    const sorted = Array.from(allBuckets).sort();

    return sorted.map((date) => ({
      date,
      created: createdByDate.get(date) ?? 0,
      completed: completedByDate.get(date) ?? 0,
      failed: failedByDate.get(date) ?? 0,
    }));
  }

  private async getCatalogTimeSeries(
    from: Date,
    to: Date,
    groupBy: GroupBy,
  ): Promise<CatalogTimeSeriesPoint[]> {
    const trunc = this.getDateTrunc(groupBy);
    const fromIso = from.toISOString();
    const toIso = to.toISOString();

    const worksQb = this.workRepo
      .createQueryBuilder('w')
      .select(`date_trunc('${trunc}', w.created_at AT TIME ZONE 'UTC')`, 'bucket')
      .addSelect('COUNT(*)', 'count')
      .where('w.created_at >= :from', { from: fromIso })
      .andWhere('w.created_at <= :to', { to: toIso })
      .groupBy('bucket')
      .orderBy('bucket', 'ASC');

    const editionsQb = this.editionRepo
      .createQueryBuilder('e')
      .select(`date_trunc('${trunc}', e.created_at AT TIME ZONE 'UTC')`, 'bucket')
      .addSelect('COUNT(*)', 'count')
      .where('e.created_at >= :from', { from: fromIso })
      .andWhere('e.created_at <= :to', { to: toIso })
      .groupBy('bucket')
      .orderBy('bucket', 'ASC');

    const [worksRows, editionsRows] = await Promise.all([
      worksQb.getRawMany<{ bucket: Date; count: string }>(),
      editionsQb.getRawMany<{ bucket: Date; count: string }>(),
    ]);

    const worksByDate = new Map<string, number>();
    for (const row of worksRows) {
      worksByDate.set(new Date(row.bucket).toISOString(), parseInt(row.count, 10));
    }
    const editionsByDate = new Map<string, number>();
    for (const row of editionsRows) {
      editionsByDate.set(
        new Date(row.bucket).toISOString(),
        parseInt(row.count, 10),
      );
    }

    const allBuckets = new Set<string>([
      ...worksByDate.keys(),
      ...editionsByDate.keys(),
    ]);
    const sorted = Array.from(allBuckets).sort();

    return sorted.map((date) => ({
      date,
      works: worksByDate.get(date) ?? 0,
      editions: editionsByDate.get(date) ?? 0,
    }));
  }
}
