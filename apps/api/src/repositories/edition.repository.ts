import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Edition } from '@toth/database';

@Injectable()
export class EditionRepository {
  constructor(
    @InjectRepository(Edition)
    private readonly repo: Repository<Edition>,
  ) {}

  async findById(id: string): Promise<Edition | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['work', 'work.author', 'source'],
    });
  }

  async findByWorkId(workId: string): Promise<Edition[]> {
    return this.repo.find({
      where: { work_id: workId },
      relations: ['source'],
      order: { quality_score: 'DESC' },
    });
  }

  async save(entity: Partial<Edition>): Promise<Edition> {
    return this.repo.save(this.repo.create(entity));
  }

  async saveMany(entities: Partial<Edition>[]): Promise<Edition[]> {
    return this.repo.save(entities.map((e) => this.repo.create(e)));
  }

  async deleteByWorkId(workId: string): Promise<void> {
    await this.repo.delete({ work_id: workId });
  }
}
