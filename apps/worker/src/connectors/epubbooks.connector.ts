import type { RawEditionRecord, SourceConnector } from '@toth/shared';
import {
  connectorFetchOptions,
  delayBetweenPages,
  fetchWithRetry,
} from './http';

const BASE = 'https://www.epubbooks.com';
const SUBJECTS_URL = `${BASE}/subjects`;
const DELAY_BETWEEN_PAGES_MS = 1500;

/** Parse /subjects page: extract subject paths from div.row links (href="/subject/xxx"). */
function parseSubjectPaths(html: string): string[] {
  const paths: string[] = [];
  const seen = new Set<string>();
  const regex = /href=["'](\/subject\/[^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(html)) !== null) {
    const path = m[1].replace(/\/$/, '');
    if (!seen.has(path)) {
      seen.add(path);
      paths.push(path);
    }
  }
  return paths;
}

interface ListingBook {
  id: string;
  slug: string;
  title: string;
  author: string;
  bookUrl: string;
  coverUrl: string | null;
  descriptionSnippet: string | null;
}

/**
 * Parse subject listing: ul.media-list with li.media items. Each has
 * /book/id-slug, title in media-heading, author in span.small, thumb img, and p text.
 */
function parseSubjectListing(html: string): ListingBook[] {
  const books: ListingBook[] = [];
  const blockRegex = /<li\s+class="media">\s*<a\s+class="media-left"\s+href=["'](\/book\/(\d+)-([^"']+))["'][\s\S]*?<h2\s+class="media-heading">\s*<a\s+href=["'][^"']+["']>([\s\S]*?)<\/a>\s*<span\s+class="small">([^<]*)<\/span>/gi;
  let block: RegExpExecArray | null;
  while ((block = blockRegex.exec(html)) !== null) {
    const bookPath = block[1];
    const id = block[2];
    const slug = block[3];
    const title = block[4].replace(/<[^>]+>/g, '').trim() || slug;
    const author = block[5].trim() || 'Unknown';
    const bookUrl = `${BASE}${bookPath}`;

    const afterHeading = html.slice(block.index + block[0].length, block.index + block[0].length + 1200);
    const imgMatch = /<img[^>]+src=["']([^"']+)["']/.exec(block[0]);
    const coverUrl = imgMatch
      ? imgMatch[1].startsWith('http')
        ? imgMatch[1]
        : BASE + imgMatch[1]
      : null;
    const pMatch = /<p>([\s\S]*?)<a\s+[^>]*href=["'][^"']+["'][^>]*>\s*read more/i.exec(afterHeading);
    const rawP = pMatch ? pMatch[1] : null;
    const descriptionSnippet = rawP
      ? rawP.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 500) || null
      : null;

    books.push({
      id,
      slug,
      title,
      author,
      bookUrl,
      coverUrl,
      descriptionSnippet,
    });
  }
  return books;
}

/** Extract next page URL from pagination: <a rel="next" href="...">. */
function parseNextPageUrl(html: string): string | null {
  const m = /<a\s+rel=["']next["'][^>]+href=["']([^"']+)["']/.exec(html);
  if (!m) return null;
  const href = m[1];
  return href.startsWith('http') ? href : BASE + href;
}

export class EpubbooksConnector implements SourceConnector {
  constructor(public readonly sourceId: string) {}

  async *fetchCatalog(): AsyncGenerator<RawEditionRecord, void, unknown> {
    const opts = connectorFetchOptions();
    const seenIds = new Set<string>();

    const subjectsRes = await fetchWithRetry(SUBJECTS_URL, opts);
    if (!subjectsRes.ok) {
      throw new Error(`Epubbooks subjects error: ${subjectsRes.status}`);
    }
    const subjectsHtml = await subjectsRes.text();
    const subjectPaths = parseSubjectPaths(subjectsHtml);
    if (subjectPaths.length === 0) return;

    let firstSubjectPage = true;
    for (const subjectPath of subjectPaths) {
      let currentUrl: string | null = `${BASE}${subjectPath}`;

      while (currentUrl) {
        if (!firstSubjectPage) await delayBetweenPages(DELAY_BETWEEN_PAGES_MS);
        firstSubjectPage = false;

        const res = await fetchWithRetry(currentUrl, opts);
        if (!res.ok) {
          if (res.status === 404) break;
          throw new Error(`Epubbooks listing error: ${res.status} ${currentUrl}`);
        }
        const html = await res.text();
        const items = parseSubjectListing(html);

        for (const item of items) {
          if (seenIds.has(item.id)) continue;
          seenIds.add(item.id);

          yield {
            source_id: this.sourceId,
            external_id: item.id,
            title: item.title,
            authors: [item.author],
            language: 'en',
            description: item.descriptionSnippet,
            subjects: [],
            license: 'public-domain',
            download_url: item.bookUrl,
            file_size: null,
            published_date: null,
            cover_url: item.coverUrl,
          };
        }

        currentUrl = parseNextPageUrl(html);
      }
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetchWithRetry(SUBJECTS_URL, connectorFetchOptions());
      return res.ok;
    } catch {
      return false;
    }
  }
}
