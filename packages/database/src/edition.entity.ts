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
import { Work } from './work.entity';

@Entity('editions')
export class Edition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'work_id' })
  work_id: string;

  @Column({ type: 'uuid', name: 'source_id' })
  source_id: string;

  @Column({ type: 'varchar', length: 100 })
  license: string;

  @Column({ type: 'bigint', nullable: true, name: 'file_size' })
  file_size: number | null;

  @Column({ type: 'varchar', length: 2048, name: 'download_url' })
  download_url: string;

  @Column({ type: 'varchar', length: 2048, nullable: true, name: 'cover_url' })
  cover_url: string | null;

  @Column({ type: 'decimal', precision: 5, scale: 4, default: 0, name: 'quality_score' })
  quality_score: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @ManyToOne(() => Work, (work) => work.editions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'work_id' })
  work: Work;

  @ManyToOne(() => Source, (source) => source.editions, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'source_id' })
  source: Source;
}
