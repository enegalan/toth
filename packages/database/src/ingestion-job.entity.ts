import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Source } from './source.entity';

export type IngestionJobStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

@Entity('ingestion_jobs')
export class IngestionJob {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'source_id' })
  source_id: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: IngestionJobStatus;

  @Column({ type: 'timestamptz', nullable: true, name: 'started_at' })
  started_at: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'completed_at' })
  completed_at: Date | null;

  @Column({ type: 'text', nullable: true, name: 'error_message' })
  error_message: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @ManyToOne(() => Source, (source) => source.ingestion_jobs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'source_id' })
  source: Source;
}
