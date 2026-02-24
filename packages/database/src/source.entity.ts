import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Edition } from './edition.entity';
import { IngestionJob } from './ingestion-job.entity';

@Entity('sources')
export class Source {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 2048, name: 'base_url' })
  base_url: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 1, name: 'trust_score' })
  trust_score: number;

  @Column({ type: 'varchar', length: 100, name: 'license_type' })
  license_type: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'connector_type' })
  connector_type: string | null;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ type: 'text', nullable: true, name: 'legal_basis' })
  legal_basis: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @OneToMany(() => Edition, (edition) => edition.source)
  editions: Edition[];

  @OneToMany(() => IngestionJob, (job) => job.source)
  ingestion_jobs: IngestionJob[];
}
