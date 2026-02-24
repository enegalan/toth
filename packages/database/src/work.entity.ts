import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Author } from './author.entity';
import { Edition } from './edition.entity';

@Entity('works')
export class Work {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 1000, name: 'canonical_title' })
  canonical_title: string;

  @Column({ type: 'uuid', name: 'author_id' })
  author_id: string;

  @Column({ type: 'varchar', length: 20 })
  language: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'jsonb', default: [] })
  subjects: string[];

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 0, name: 'popularity_score' })
  popularity_score: number;

  @Column({ type: 'integer', default: 0, name: 'view_count' })
  view_count: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @ManyToOne(() => Author, (author) => author.works, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'author_id' })
  author: Author;

  @OneToMany(() => Edition, (edition) => edition.work)
  editions: Edition[];
}
