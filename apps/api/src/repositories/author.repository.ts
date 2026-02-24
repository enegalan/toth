import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Author } from '@toth/database';

@Injectable()
export class AuthorRepository {
  constructor(
    @InjectRepository(Author)
    private readonly repo: Repository<Author>,
  ) {}

  async findById(id: string): Promise<Author | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByIdOrFail(id: string): Promise<Author> {
    const author = await this.findById(id);
    if (!author) {
      throw new NotFoundException('Author not found');
    }
    return author;
  }

  async findByIds(ids: string[]): Promise<Author[]> {
    if (ids.length === 0) return [];
    return this.repo.find({ where: ids.map((id) => ({ id })) });
  }

  async save(entity: Partial<Author>): Promise<Author> {
    return this.repo.save(this.repo.create(entity));
  }

  async findByNameOrAlias(name: string): Promise<Author | null> {
    return this.repo
      .createQueryBuilder('a')
      .where('a.canonical_name = :name', { name })
      .orWhere("a.aliases @> CAST(:arr AS jsonb)", { arr: JSON.stringify([name]) })
      .getOne();
  }
}
