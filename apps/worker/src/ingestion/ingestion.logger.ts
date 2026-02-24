import { Logger } from '@nestjs/common';

export const ingestionLogger = new Logger('Ingestion');

export function logJobStart(jobId: string, sourceId: string): void {
  ingestionLogger.log(
    JSON.stringify({
      event: 'job_start',
      job_id: jobId,
      source_id: sourceId,
      timestamp: new Date().toISOString(),
    }),
  );
}

export function logJobComplete(
  jobId: string,
  sourceId: string,
  recordCount: number,
  durationMs: number,
): void {
  ingestionLogger.log(
    JSON.stringify({
      event: 'job_complete',
      job_id: jobId,
      source_id: sourceId,
      record_count: recordCount,
      duration_ms: durationMs,
      timestamp: new Date().toISOString(),
    }),
  );
}

export function logJobFailed(
  jobId: string,
  sourceId: string,
  errorMessage: string,
): void {
  ingestionLogger.error(
    JSON.stringify({
      event: 'job_failed',
      job_id: jobId,
      source_id: sourceId,
      error_message: errorMessage,
      timestamp: new Date().toISOString(),
    }),
  );
}
