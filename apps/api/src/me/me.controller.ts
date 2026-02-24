import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SavedWorkRepository } from '../repositories/saved-work.repository';
import { WorkRepository } from '../repositories/work.repository';
import { WorkSummaryDto } from '../works/work.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/auth.service';

@Controller('me')
@UseGuards(AuthGuard)
export class MeController {
  constructor(
    private readonly savedRepo: SavedWorkRepository,
    private readonly workRepo: WorkRepository,
  ) {}

  @Get('saved/check/:workId')
  async checkSaved(
    @Param('workId', ParseUUIDPipe) workId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ saved: boolean }> {
    const saved = await this.savedRepo.isSaved(user.id, workId);
    return { saved };
  }

  @Get('saved')
  async getSaved(
    @CurrentUser() user: AuthUser,
  ): Promise<{ works: WorkSummaryDto[] }> {
    const workIds = await this.savedRepo.findWorkIdsByUser(user.id);
    if (workIds.length === 0) {
      return { works: [] };
    }
    const works = await this.workRepo.findByIds(workIds);
    const orderMap = new Map(workIds.map((id, i) => [id, i]));
    works.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
    return {
      works: works.map(WorkSummaryDto.fromWork),
    };
  }

  @Post('saved')
  async addSaved(
    @Body() body: { work_id: string },
    @CurrentUser() user: AuthUser,
  ): Promise<{ saved: boolean }> {
    const workId = body.work_id;
    if (!workId) {
      return { saved: false };
    }
    const work = await this.workRepo.findById(workId);
    if (!work) {
      return { saved: false };
    }
    await this.savedRepo.add(user.id, workId);
    return { saved: true };
  }

  @Delete('saved/:workId')
  async removeSaved(
    @Param('workId', ParseUUIDPipe) workId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ removed: boolean }> {
    const removed = await this.savedRepo.remove(user.id, workId);
    return { removed };
  }
}
