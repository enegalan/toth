import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkRating } from '@toth/database';

@Injectable()
export class WorkRatingRepository {
  constructor(
    @InjectRepository(WorkRating)
    private readonly repo: Repository<WorkRating>,
  ) {}

  async upsert(workId: string, userId: string, score: number): Promise<WorkRating> {
    let rating = await this.repo.findOne({
      where: { work_id: workId, user_id: userId },
    });
    if (rating) {
      rating.score = score;
      return this.repo.save(rating);
    }
    rating = this.repo.create({ work_id: workId, user_id: userId, score });
    return this.repo.save(rating);
  }

  async findByWorkAndUser(
    workId: string,
    userId: string,
  ): Promise<WorkRating | null> {
    return this.repo.findOne({
      where: { work_id: workId, user_id: userId },
    });
  }

  async remove(workId: string, userId: string): Promise<boolean> {
    const result = await this.repo.delete({
      work_id: workId,
      user_id: userId,
    });
    return (result.affected ?? 0) > 0;
  }

  async getWorkStats(workId: string): Promise<{ average: number; count: number }> {
    const result = await this.repo
      .createQueryBuilder('r')
      .select('AVG(r.score)', 'average')
      .addSelect('COUNT(r.id)', 'count')
      .where('r.work_id = :workId', { workId })
      .getRawOne<{ average: string; count: string }>();
    const count = result?.count ? parseInt(result.count, 10) : 0;
    const average = result?.average ? parseFloat(result.average) : 0;
    return { average: Math.round(average * 10) / 10, count };
  }

  async getStatsByWorkIds(workIds: string[]): Promise<Map<string, { average: number; count: number }>> {
    if (workIds.length === 0) return new Map();
    const result = await this.repo
      .createQueryBuilder('r')
      .select('r.work_id', 'work_id')
      .addSelect('AVG(r.score)', 'average')
      .addSelect('COUNT(r.id)', 'count')
      .where('r.work_id IN (:...workIds)', { workIds })
      .groupBy('r.work_id')
      .getRawMany<{ work_id: string; average: string; count: string }>();
    const map = new Map<string, { average: number; count: number }>();
    for (const row of result) {
      const count = row.count ? parseInt(row.count, 10) : 0;
      const average = row.average ? parseFloat(row.average) : 0;
      map.set(row.work_id, {
        average: Math.round(average * 10) / 10,
        count,
      });
    }
    return map;
  }
}
