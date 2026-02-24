import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Author, Work } from '@toth/database';
import type { NormalizedRecord } from '../normalization/normalization.service';

@Injectable()
export class DeduplicationService {
  constructor(
    @InjectRepository(Author)
    private readonly authorRepo: Repository<Author>,
    @InjectRepository(Work)
    private readonly workRepo: Repository<Work>,
  ) {}

  async resolveAuthor(authors: string[]): Promise<{ authorId: string; confidence: number }> {
    const name = authors[0]?.trim() || 'Unknown';
    let author = await this.authorRepo.findOne({
      where: { canonical_name: name },
    });
    if (author) return { authorId: author.id, confidence: 1 };
    author = await this.findAuthorByAlias(name);
    if (author) return { authorId: author.id, confidence: 0.9 };
    author = this.authorRepo.create({
      canonical_name: name,
      aliases: [],
    });
    author = await this.authorRepo.save(author);
    return { authorId: author.id, confidence: 1 };
  }

  async resolveWork(
    record: NormalizedRecord,
    authorId: string,
  ): Promise<{ workId: string; confidence: number }> {
    let work = await this.workRepo
      .createQueryBuilder('w')
      .where('w.canonical_title = :title', { title: record.title })
      .andWhere('w.author_id = :authorId', { authorId })
      .andWhere('w.language = :lang', { lang: record.language })
      .getOne();
    if (work) return { workId: work.id, confidence: 1 };
    work = await this.findWorkFuzzy(record.title, authorId, record.language);
    if (work) return { workId: work.id, confidence: 0.85 };
    work = this.workRepo.create({
      canonical_title: record.title,
      author_id: authorId,
      language: record.language,
      description: record.description,
      subjects: record.subjects,
      popularity_score: 0,
    });
    work = await this.workRepo.save(work);
    return { workId: work.id, confidence: 1 };
  }

  private async findAuthorByAlias(name: string): Promise<Author | null> {
    return this.authorRepo
      .createQueryBuilder('a')
      .where('a.aliases @> CAST(:arr AS jsonb)', {
        arr: JSON.stringify([name]),
      })
      .getOne();
  }

  private async findWorkFuzzy(
    title: string,
    authorId: string,
    language: string,
  ): Promise<Work | null> {
    const works = await this.workRepo.find({
      where: { author_id: authorId, language },
      take: 50,
    });
    const normalizedTitle = title.toLowerCase();
    for (const w of works) {
      const sim = this.titleSimilarity(normalizedTitle, w.canonical_title.toLowerCase());
      if (sim >= 0.85) return w;
    }
    return null;
  }

  private titleSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    const wordsA = new Set(a.split(/\s+/).filter(Boolean));
    const wordsB = new Set(b.split(/\s+/).filter(Boolean));
    let match = 0;
    for (const w of wordsA) {
      if (wordsB.has(w)) match += 1;
    }
    const union = new Set([...wordsA, ...wordsB]).size;
    return union === 0 ? 0 : match / union;
  }
}
