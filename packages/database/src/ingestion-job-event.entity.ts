import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { IngestionJob } from './ingestion-job.entity';

@Entity('ingestion_job_events')
@Index(['job_id', 'created_at'])
export class IngestionJobEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'job_id' })
  job_id: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @Column({ type: 'varchar', length: 50, name: 'event_type' })
  event_type: string;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ type: 'jsonb', nullable: true })
  detail: Record<string, unknown> | null;

  @ManyToOne(() => IngestionJob, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job: IngestionJob;
}
