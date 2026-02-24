import { Controller, Post, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { MeilisearchService } from '../search/meilisearch.service';

@Controller('admin/search')
@UseGuards(AdminGuard)
export class AdminSearchController {
  constructor(private readonly meilisearch: MeilisearchService) {}

  @Post('clear')
  async clearIndex(): Promise<{ message: string; taskUid: number }> {
    const { taskUid } = await this.meilisearch.clearIndex();
    return {
      message: 'Search index clear requested. All indexed works will be removed.',
      taskUid,
    };
  }
}
