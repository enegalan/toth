import { Controller, Get, NotFoundException, Param, ParseUUIDPipe } from '@nestjs/common';
import { AuthorRepository } from '../repositories/author.repository';
import { AuthorDto } from './author.dto';

@Controller('authors')
export class AuthorsController {
  constructor(private readonly authorRepo: AuthorRepository) {}

  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AuthorDto> {
    const author = await this.authorRepo.findById(id);
    if (!author) throw new NotFoundException('Author not found');
    return AuthorDto.from(author);
  }
}
