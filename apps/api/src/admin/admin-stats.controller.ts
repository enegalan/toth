import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AdminStatsService, GroupBy } from './admin-stats.service';

@Controller('admin/stats')
@UseGuards(AdminGuard)
export class AdminStatsController {
  constructor(private readonly statsService: AdminStatsService) {}

  @Get()
  async getStats(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('groupBy') groupBy?: string,
    @Query('sourceId') sourceId?: string,
  ) {
    const validGroupBy: GroupBy[] = ['day', 'week', 'month'];
    const parsedGroupBy =
      groupBy && validGroupBy.includes(groupBy as GroupBy)
        ? (groupBy as GroupBy)
        : undefined;

    if (from) {
      const fromDate = new Date(from);
      if (isNaN(fromDate.getTime())) {
        throw new BadRequestException('Invalid "from" date');
      }
    }
    if (to) {
      const toDate = new Date(to);
      if (isNaN(toDate.getTime())) {
        throw new BadRequestException('Invalid "to" date');
      }
    }

    return this.statsService.getStats({
      from: from || undefined,
      to: to || undefined,
      groupBy: parsedGroupBy,
      sourceId: sourceId || undefined,
    });
  }
}
