import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type TakedownStatus = 'pending' | 'approved' | 'rejected';

@Entity('takedown_requests')
export class TakedownRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 500, name: 'claimant_email' })
  claimant_email: string;

  @Column({ type: 'text', name: 'reason' })
  reason: string;

  @Column({ type: 'varchar', length: 2048, nullable: true, name: 'work_id' })
  work_id: string | null;

  @Column({ type: 'varchar', length: 2048, nullable: true, name: 'edition_id' })
  edition_id: string | null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: TakedownStatus;

  @Column({ type: 'text', nullable: true, name: 'review_notes' })
  review_notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
