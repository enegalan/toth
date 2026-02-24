import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedWork } from '@toth/database';

@Injectable()
export class SavedWorkRepository {
  constructor(
    @InjectRepository(SavedWork)
    private readonly repo: Repository<SavedWork>,
  ) {}

  async add(userId: string, workId: string): Promise<SavedWork> {
    const existing = await this.repo.findOne({
      where: { user_id: userId, work_id: workId },
    });
    if (existing) return existing;
    const saved = this.repo.create({ user_id: userId, work_id: workId });
    return this.repo.save(saved);
  }

  async remove(userId: string, workId: string): Promise<boolean> {
    const result = await this.repo.delete({
      user_id: userId,
      work_id: workId,
    });
    return (result.affected ?? 0) > 0;
  }

  async findWorkIdsByUser(userId: string): Promise<string[]> {
    const rows = await this.repo.find({
      where: { user_id: userId },
      select: ['work_id'],
      order: { created_at: 'DESC' },
    });
    return rows.map((r) => r.work_id);
  }

  async isSaved(userId: string, workId: string): Promise<boolean> {
    const one = await this.repo.findOne({
      where: { user_id: userId, work_id: workId },
    });
    return !!one;
  }

  async getSaveCountByWorkIds(workIds: string[]): Promise<Map<string, number>> {
    if (workIds.length === 0) return new Map();
    const result = await this.repo
      .createQueryBuilder('s')
      .select('s.work_id', 'work_id')
      .addSelect('COUNT(*)', 'count')
      .where('s.work_id IN (:...workIds)', { workIds })
      .groupBy('s.work_id')
      .getRawMany<{ work_id: string; count: string }>();
    const map = new Map<string, number>();
    for (const row of result) {
      map.set(row.work_id, row.count ? parseInt(row.count, 10) : 0);
    }
    return map;
  }
}
