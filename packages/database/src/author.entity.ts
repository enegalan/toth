import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Work } from './work.entity';

@Entity('authors')
export class Author {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 500 })
  canonical_name: string;

  @Column({ type: 'jsonb', default: [] })
  aliases: string[];

  @Column({ type: 'int', nullable: true })
  birth_year: number | null;

  @Column({ type: 'int', nullable: true })
  death_year: number | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @OneToMany(() => Work, (work) => work.author)
  works: Work[];
}
