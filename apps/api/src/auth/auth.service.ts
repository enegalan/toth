import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserRepository } from '../repositories/user.repository';
import { SessionRepository } from '../repositories/session.repository';
import type { UserRole } from '@toth/database';

const SALT_ROUNDS = 10;
const SESSION_DAYS = 30;

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly sessionRepo: SessionRepository,
  ) {}

  async register(
    email: string,
    password: string,
  ): Promise<{ user: AuthUser; token: string; expiresAt: Date }> {
    const existing = await this.userRepo.findByEmail(email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await this.userRepo.create({
      email,
      password_hash,
      role: 'user',
    });
    const { token, expires_at } = await this.createSession(user.id);
    return {
      user: this.toAuthUser(user),
      token,
      expiresAt: expires_at,
    };
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ user: AuthUser; token: string; expiresAt: Date }> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const { token, expires_at } = await this.createSession(user.id);
    return {
      user: this.toAuthUser(user),
      token,
      expiresAt: expires_at,
    };
  }

  async logout(token: string): Promise<void> {
    await this.sessionRepo.deleteByToken(token);
  }

  async validateSession(token: string): Promise<AuthUser | null> {
    const session = await this.sessionRepo.findByToken(token);
    if (!session || new Date() >= session.expires_at) return null;
    return this.toAuthUser(session.user);
  }

  private async createSession(userId: string): Promise<{
    token: string;
    expires_at: Date;
  }> {
    const expires_at = new Date();
    expires_at.setDate(expires_at.getDate() + SESSION_DAYS);
    const session = await this.sessionRepo.create(userId, expires_at);
    return { token: session.token, expires_at: session.expires_at };
  }

  private toAuthUser(user: { id: string; email: string; role: string }): AuthUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
    };
  }
}
