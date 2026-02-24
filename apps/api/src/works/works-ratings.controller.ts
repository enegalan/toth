import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { WorkRatingRepository } from '../repositories/work-rating.repository';
import { WorkRepository } from '../repositories/work.repository';
import { AuthGuard } from '../auth/auth.guard';
import { AuthService } from '../auth/auth.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.service';
import { SESSION_COOKIE_NAME } from '../auth/auth.constants';

@Controller('works')
export class WorksRatingsController {
  constructor(
    private readonly workRepo: WorkRepository,
    private readonly ratingRepo: WorkRatingRepository,
    private readonly auth: AuthService,
  ) {}

  @Get(':id/ratings')
  async getRatings(
    @Param('id', ParseUUIDPipe) workId: string,
    @Req() req: Request,
  ): Promise<{ average: number; count: number; userRating?: number }> {
    const work = await this.workRepo.findById(workId);
    if (!work) {
      return { average: 0, count: 0 };
    }
    const stats = await this.ratingRepo.getWorkStats(workId);
    const token = req.cookies?.[SESSION_COOKIE_NAME];
    const user = token ? await this.auth.validateSession(token) : null;
    let userRating: number | undefined;
    if (user) {
      const r = await this.ratingRepo.findByWorkAndUser(workId, user.id);
      if (r) userRating = r.score;
    }
    return { ...stats, userRating };
  }

  @Post(':id/rate')
  @UseGuards(AuthGuard)
  async rate(
    @Param('id', ParseUUIDPipe) workId: string,
    @Body() body: { score: number },
    @CurrentUser() user: AuthUser,
  ): Promise<{ average: number; count: number; userRating: number }> {
    const score = Math.min(5, Math.max(1, Math.round(Number(body.score) || 0)));
    await this.ratingRepo.upsert(workId, user.id, score);
    const stats = await this.ratingRepo.getWorkStats(workId);
    return {
      ...stats,
      userRating: score,
    };
  }

  @Delete(':id/rate')
  @UseGuards(AuthGuard)
  async removeRate(
    @Param('id', ParseUUIDPipe) workId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ average: number; count: number }> {
    await this.ratingRepo.remove(workId, user.id);
    return this.ratingRepo.getWorkStats(workId);
  }
}
