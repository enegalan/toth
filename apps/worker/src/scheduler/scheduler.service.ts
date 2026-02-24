import { Injectable, OnModuleInit } from '@nestjs/common';
import { IngestionService } from '../ingestion/ingestion.service';

const POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

@Injectable()
export class SchedulerService implements OnModuleInit {
  constructor(private readonly ingestion: IngestionService) {}

  onModuleInit(): void {
    setInterval(() => void this.tick(), POLL_INTERVAL_MS);
    void this.tick();
  }

  private async tick(): Promise<void> {
    const pending = await this.ingestion.getPendingJobIds();
    for (const jobId of pending) {
      try {
        await this.ingestion.runJob(jobId);
      } catch {
        // Error already stored on job
      }
    }
  }
}
