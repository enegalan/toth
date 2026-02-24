import { Controller, Get, NotFoundException, Param, ParseUUIDPipe } from '@nestjs/common';
import { WorkRepository } from '../repositories/work.repository';
import { SavedWorkRepository } from '../repositories/saved-work.repository';
import { WorkDetailDto } from './work.dto';

@Controller('works')
export class WorksController {
  constructor(
    private readonly workRepo: WorkRepository,
    private readonly savedWorkRepo: SavedWorkRepository,
  ) {}

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WorkDetailDto> {
    const work = await this.workRepo.findById(id);
    if (!work) throw new NotFoundException('Work not found');
    await this.workRepo.incrementViewCount(id);
    const savedCountMap = await this.savedWorkRepo.getSaveCountByWorkIds([id]);
    const saved_count = savedCountMap.get(id) ?? 0;
    return WorkDetailDto.from(
      {
        ...work,
        view_count: (work.view_count ?? 0) + 1,
      },
      { saved_count },
    );
  }
}
