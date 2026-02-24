import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Source } from '@toth/database';

@Injectable()
export class SourceRepository {
  constructor(
    @InjectRepository(Source)
    private readonly repo: Repository<Source>,
  ) {}

  async findById(id: string): Promise<Source | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findAll(): Promise<Source[]> {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async save(entity: Partial<Source>): Promise<Source> {
    return this.repo.save(this.repo.create(entity));
  }
}
