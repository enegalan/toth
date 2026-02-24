import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MeilisearchService } from '../search/meilisearch.service';
import { WorkRepository } from '../repositories/work.repository';
import { WorkRatingRepository } from '../repositories/work-rating.repository';
import { SavedWorkRepository } from '../repositories/saved-work.repository';

const WEIGHT_VIEWS = 1;
const WEIGHT_RATINGS = 2;
const WEIGHT_SAVED = 1.5;

@Injectable()
export class PopularityService {
  private readonly logger = new Logger(PopularityService.name);

  constructor(
    private readonly workRepo: WorkRepository,
    private readonly workRatingRepo: WorkRatingRepository,
    private readonly savedWorkRepo: SavedWorkRepository,
    private readonly meilisearch: MeilisearchService,
  ) {}

  @Cron('0 * * * *')
  async handleHourlyRecompute(): Promise<void> {
    try {
      await this.recomputeAll();
    } catch {
      // Error already logged in recomputeAll
    }
  }

  async recomputeAll(): Promise<void> {
    try {
      const works = await this.workRepo.findAllIdsAndViewCounts();
      if (works.length === 0) return;

      const workIds = works.map((w) => w.id);
      const [ratingStats, savedCounts] = await Promise.all([
        this.workRatingRepo.getStatsByWorkIds(workIds),
        this.savedWorkRepo.getSaveCountByWorkIds(workIds),
      ]);

      const updates: Array<{ id: string; popularity_score: number }> = [];
      for (const w of works) {
        const viewCount = w.view_count ?? 0;
        const stats = ratingStats.get(w.id) ?? { average: 0, count: 0 };
        const savedCount = savedCounts.get(w.id) ?? 0;

        const viewsTerm = WEIGHT_VIEWS * Math.log(1 + viewCount);
        const ratingsTerm =
          WEIGHT_RATINGS * stats.count * (stats.average / 5);
        const savedTerm = WEIGHT_SAVED * Math.log(1 + savedCount);

        const popularity_score = Math.round((viewsTerm + ratingsTerm + savedTerm) * 10000) / 10000;
        updates.push({ id: w.id, popularity_score });
      }

      await this.workRepo.updatePopularityScores(updates);
      await this.meilisearch.updatePopularityScores(updates);
      this.logger.log(`Recomputed popularity for ${updates.length} works`);
    } catch (err) {
      this.logger.error('Popularity recompute failed', err);
      throw err;
    }
  }
}
