import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Work } from '@toth/database';

export interface WorkListOptions {
  language?: string;
  author_id?: string;
  limit: number;
  offset: number;
}

@Injectable()
export class WorkRepository {
  constructor(
    @InjectRepository(Work)
    private readonly repo: Repository<Work>,
  ) {}

  async findById(id: string): Promise<Work | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['author', 'editions', 'editions.source'],
    });
  }

  async incrementViewCount(id: string): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(Work)
      .set({ view_count: () => 'view_count + 1' })
      .where('id = :id', { id })
      .execute();
  }

  async findByIds(ids: string[]): Promise<Work[]> {
    if (ids.length === 0) return [];
    return this.repo.find({
      where: ids.map((id) => ({ id })),
      relations: ['author', 'editions', 'editions.source'],
    });
  }

  async save(entity: Partial<Work>): Promise<Work> {
    return this.repo.save(this.repo.create(entity));
  }

  async findMany(options: WorkListOptions): Promise<Work[]> {
    const qb = this.repo
      .createQueryBuilder('w')
      .leftJoinAndSelect('w.author', 'author')
      .leftJoinAndSelect('w.editions', 'editions')
      .leftJoinAndSelect('editions.source', 'source')
      .take(options.limit)
      .skip(options.offset)
      .orderBy('w.updated_at', 'DESC');
    if (options.language) {
      qb.andWhere('w.language = :language', { language: options.language });
    }
    if (options.author_id) {
      qb.andWhere('w.author_id = :author_id', { author_id: options.author_id });
    }
    return qb.getMany();
  }

  async findTopSubjects(limit: number): Promise<string[]> {
    const result = await this.repo.query(
      `SELECT DISTINCT jsonb_array_elements_text(subjects) AS subject
        FROM works
        WHERE subjects IS NOT NULL AND jsonb_array_length(subjects) > 0
        LIMIT $1`,
      [limit],
    );
    return (result as Array<{ subject: string }>).map((r) => r.subject);
  }

  async findSubjects(limit: number = 200): Promise<string[]> {
    const result = await this.repo.query(
      `SELECT subject
        FROM (
            SELECT jsonb_array_elements_text(subjects) AS subject
            FROM works
            WHERE subjects IS NOT NULL AND jsonb_array_length(subjects) > 0
        ) sub
        GROUP BY subject
        ORDER BY COUNT(*) DESC
        LIMIT $1`,
      [limit],
    );
    return (result as Array<{ subject: string }>).map((r) => r.subject);
  }

  async findAllIdsAndViewCounts(): Promise<Array<{ id: string; view_count: number }>> {
    const rows = await this.repo.find({
      select: ['id', 'view_count'],
    });
    return rows.map((r) => ({
      id: r.id,
      view_count: r.view_count ?? 0,
    }));
  }

  async updatePopularityScores(
    updates: Array<{ id: string; popularity_score: number }>,
  ): Promise<void> {
    if (updates.length === 0) return;
    for (const { id, popularity_score } of updates) {
      await this.repo.update({ id }, { popularity_score });
    }
  }
}
