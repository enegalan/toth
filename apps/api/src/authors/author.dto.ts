import { Author } from '@toth/database';

export class AuthorDto {
  id: string;
  canonical_name: string;
  aliases: string[];
  birth_year: number | null;
  death_year: number | null;

  static from(author: Author): AuthorDto {
    return {
      id: author.id,
      canonical_name: author.canonical_name,
      aliases: Array.isArray(author.aliases) ? author.aliases : [],
      birth_year: author.birth_year,
      death_year: author.death_year,
    };
  }
}
