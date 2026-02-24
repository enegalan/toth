import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@toth/database';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email: email.toLowerCase().trim() } });
  }

  async create(data: {
    email: string;
    password_hash: string;
    role?: User['role'];
  }): Promise<User> {
    const user = this.repo.create({
      email: data.email.toLowerCase().trim(),
      password_hash: data.password_hash,
      role: data.role ?? 'user',
    });
    return this.repo.save(user);
  }
}
