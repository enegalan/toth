import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '@toth/database';
import { randomBytes } from 'crypto';

const TOKEN_BYTES = 32;

@Injectable()
export class SessionRepository {
  constructor(
    @InjectRepository(Session)
    private readonly repo: Repository<Session>,
  ) {}

  generateToken(): string {
    return randomBytes(TOKEN_BYTES).toString('hex');
  }

  async create(userId: string, expiresAt: Date): Promise<Session> {
    const token = this.generateToken();
    const session = this.repo.create({
      user_id: userId,
      token,
      expires_at: expiresAt,
    });
    return this.repo.save(session);
  }

  async findByToken(token: string): Promise<Session | null> {
    return this.repo.findOne({
      where: { token },
      relations: ['user'],
    });
  }

  async deleteByToken(token: string): Promise<void> {
    await this.repo.delete({ token });
  }

  async deleteExpired(): Promise<number> {
    const result = await this.repo
      .createQueryBuilder()
      .delete()
      .where('expires_at < :now', { now: new Date() })
      .execute();
    return result.affected ?? 0;
  }
}
