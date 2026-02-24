import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Work } from './work.entity';

@Entity('saved_works')
export class SavedWork {
  @PrimaryColumn({ type: 'uuid', name: 'user_id' })
  user_id: string;

  @PrimaryColumn({ type: 'uuid', name: 'work_id' })
  work_id: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @ManyToOne(() => User, (user) => user.saved_works, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Work, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'work_id' })
  work: Work;
}
