import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SavedWork } from './saved-work.entity';
import { Session } from './session.entity';
import { WorkRating } from './work-rating.entity';

export type UserRole = 'user' | 'admin';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  password_hash: string;

  @Column({ type: 'varchar', length: 20, default: 'user' })
  role: UserRole;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @OneToMany(() => Session, (session) => session.user)
  sessions: Session[];

  @OneToMany(() => WorkRating, (rating) => rating.user)
  ratings: WorkRating[];

  @OneToMany(() => SavedWork, (saved) => saved.user)
  saved_works: SavedWork[];
}
