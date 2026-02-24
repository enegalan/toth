import { Author, Edition, Work } from '@toth/database';

function pickFirstCoverUrl(
  editions: Array<{ cover_url?: string | null }>,
): string | null {
  return editions
    .map((edition) => edition.cover_url)
    .find((url): url is string => !!url) ?? null;
}

export class EditionItemDto {
  id: string;
  license: string;
  download_url: string;
  cover_url: string | null;
  file_size: number | null;
  source: SourceRefDto;
  quality_score: number;

  static from(edition: Edition & { source?: { id: string; name: string; base_url: string } }): EditionItemDto {
    return {
      id: edition.id,
      license: edition.license,
      download_url: edition.download_url,
      cover_url: edition.cover_url ?? null,
      file_size: edition.file_size,
      source: edition.source
        ? { id: edition.source.id, name: edition.source.name, base_url: edition.source.base_url }
        : { id: edition.source_id, name: '', base_url: '' },
      quality_score: Number(edition.quality_score),
    };
  }
}

export class SourceRefDto {
  id: string;
  name: string;
  base_url: string;
}

export class WorkDetailDto {
  id: string;
  canonical_title: string;
  author: { id: string; canonical_name: string };
  language: string;
  description: string | null;
  subjects: string[];
  editions: EditionItemDto[];
  cover_url: string | null;
  popularity_score: number;
  view_count: number;
  saved_count: number;

  static from(
    work: Work & { author?: Author; editions?: Array<Edition & { source?: { id: string; name: string; base_url: string } }>; view_count?: number },
    extras?: { saved_count: number },
  ): WorkDetailDto {
    const editions = work.editions ?? [];
    const coverUrl = pickFirstCoverUrl(editions);
    return {
      id: work.id,
      canonical_title: work.canonical_title,
      author: work.author
        ? { id: work.author.id, canonical_name: work.author.canonical_name }
        : { id: work.author_id, canonical_name: 'Unknown' },
      language: work.language,
      description: work.description ?? null,
      subjects: Array.isArray(work.subjects) ? work.subjects : [],
      editions: editions.map(EditionItemDto.from),
      cover_url: coverUrl,
      popularity_score: Number(work.popularity_score),
      view_count: Number(work.view_count ?? 0),
      saved_count: extras?.saved_count ?? 0,
    };
  }
}

export class WorkSummaryDto {
  id: string;
  canonical_title: string;
  author_name: string;
  author_id: string;
  language: string;
  licenses: string[];
  source_ids: string[];
  cover_url: string | null;
  popularity_score: number;

  static from(hit: {
    id: string;
    canonical_title: string;
    author_name: string;
    author_id: string;
    language: string;
    licenses: string[];
    source_ids: string[];
    cover_url?: string | null;
    popularity_score: number;
  }): WorkSummaryDto {
    return {
      id: hit.id,
      canonical_title: hit.canonical_title,
      author_name: hit.author_name,
      author_id: hit.author_id,
      language: hit.language,
      licenses: hit.licenses ?? [],
      source_ids: hit.source_ids ?? [],
      cover_url: hit.cover_url ?? null,
      popularity_score: hit.popularity_score ?? 0,
    };
  }

  static fromWork(
    work: Work & {
      author?: { id: string; canonical_name: string };
      editions?: Array<{ license: string; cover_url?: string | null }>;
    },
  ): WorkSummaryDto {
    const author_name = work.author?.canonical_name ?? 'Unknown';
    const editions = work.editions ?? [];
    const licenses = [...new Set(editions.map((edition) => edition.license))];
    const cover_url = pickFirstCoverUrl(editions);
    return {
      id: work.id,
      canonical_title: work.canonical_title,
      author_name,
      author_id: work.author_id,
      language: work.language,
      licenses,
      source_ids: [],
      cover_url,
      popularity_score: Number(work.popularity_score),
    };
  }
}
