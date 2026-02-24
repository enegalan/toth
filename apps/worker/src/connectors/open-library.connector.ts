import type { RawEditionRecord, SourceConnector } from '@toth/shared';
import { connectorFetchOptions, fetchWithRetry, throttle } from './http';

const OPEN_LIBRARY_API = 'https://openlibrary.org';
const OPEN_LIBRARY_COVER = 'https://covers.openlibrary.org/b/id';
const ARCHIVE_EPUB_URL = 'https://archive.org/download';
const REQUEST_DELAY_MS = 200;
const SEARCH_PAGE_SIZE = 100;
/** Max search pages per subject to avoid unbounded run. */
const MAX_PAGES_PER_SUBJECT = 100;
/** Search API timeout. */
const SEARCH_TIMEOUT_MS = 30000;

function buildCoverUrl(coverId: number): string {
  return `${OPEN_LIBRARY_COVER}/${coverId}-M.jpg`;
}

/**
 * Extract subject keys from /subjects page HTML: /subjects/KEY and /search?q=subject_key%3A%22KEY%22.
 * Skips the "Books by Language" section: /languages and search?q=language%3A... are not collected.
 */
function parseSubjectKeysFromHtml(html: string): string[] {
  const seen = new Set<string>();
  const keys: string[] = [];
  const subjectPathRe = /href=["']\/subjects\/([^"'?#]+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = subjectPathRe.exec(html)) !== null) {
    const key = decodeURIComponent(m[1].trim());
    if (key && key !== 'languages' && !seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
  }
  const subjectKeyQueryRe = /href=["']\/search\?q=subject_key%3A%22([^"&]+)%22["']/g;
  while ((m = subjectKeyQueryRe.exec(html)) !== null) {
    const key = decodeURIComponent(m[1].trim());
    if (key && !seen.has(key)) {
      seen.add(key);
      keys.push(key);
    }
  }
  return keys;
}

interface SearchDoc {
  key: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  ia?: string[];
  id_project_gutenberg?: string[];
  has_fulltext?: boolean;
  language?: string[];
}

interface SearchResponse {
  num_found?: number;
  start?: number;
  docs?: SearchDoc[];
}

/**
 * Open Library connector: discovers subjects from the subjects page, then uses the Search API
 * (subject_key) to paginate works. Yields one record per work that has a fulltext download
 * (Project Gutenberg or Internet Archive). Dedupes by work key across subjects.
 */
export class OpenLibraryConnector implements SourceConnector {
  constructor(public readonly sourceId: string) {}

  private async fetchJson<T>(url: string): Promise<T | null> {
    await throttle(REQUEST_DELAY_MS);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        ...connectorFetchOptions(),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) return null;
      return (await res.json()) as T;
    } catch {
      clearTimeout(timeoutId);
      return null;
    }
  }

  private async fetchHtml(url: string): Promise<string | null> {
    await throttle(REQUEST_DELAY_MS);
    const res = await fetchWithRetry(url, {
      ...connectorFetchOptions(),
      headers: {
        ...connectorFetchOptions().headers as Record<string, string>,
        Accept: 'text/html',
      },
    });
    if (!res.ok) return null;
    return res.text();
  }

  async *fetchCatalog(): AsyncGenerator<RawEditionRecord, void, unknown> {
    const subjectsHtml = await this.fetchHtml(`${OPEN_LIBRARY_API}/subjects`);
    if (!subjectsHtml) return;
    const subjectKeys = parseSubjectKeysFromHtml(subjectsHtml);
    const seenWorkKeys = new Set<string>();

    for (const subjectKey of subjectKeys) {
      let page = 1;
      let hasMore = true;
      while (hasMore && page <= MAX_PAGES_PER_SUBJECT) {
        const q = `subject_key:${subjectKey}`;
        const url = `${OPEN_LIBRARY_API}/search.json?q=${encodeURIComponent(q)}&page=${page}&limit=${SEARCH_PAGE_SIZE}`;
        const data = await this.fetchJson<SearchResponse>(url);
        const docs = data?.docs ?? [];
        if (docs.length === 0) break;

        for (const doc of docs) {
          if (!doc.key || seenWorkKeys.has(doc.key)) continue;
          const hasIa = Array.isArray(doc.ia) && doc.ia.length > 0;
          const hasPg = Array.isArray(doc.id_project_gutenberg) && doc.id_project_gutenberg.length > 0;
          if (!doc.has_fulltext || (!hasIa && !hasPg)) continue;

          const epubUrl = hasPg
            ? `https://www.gutenberg.org/ebooks/${doc.id_project_gutenberg![0]}.epub.images`
            : `${ARCHIVE_EPUB_URL}/${doc.ia![0]}/${doc.ia![0]}.epub`;
          const workId = doc.key.replace(/^\/works\//, '');
          seenWorkKeys.add(doc.key);

          const title = doc.title ?? 'Unknown';
          const authors = Array.isArray(doc.author_name) && doc.author_name.length > 0
            ? doc.author_name
            : ['Unknown'];
          const coverUrl = doc.cover_i != null ? buildCoverUrl(doc.cover_i) : null;
          const lang = Array.isArray(doc.language) && doc.language.length > 0
            ? doc.language[0]
            : 'en';

          yield {
            source_id: this.sourceId,
            external_id: workId,
            title,
            authors,
            language: lang,
            description: null,
            subjects: [subjectKey],
            license: 'public-domain',
            download_url: epubUrl,
            file_size: null,
            published_date:
              doc.first_publish_year != null ? String(doc.first_publish_year) : null,
            cover_url: coverUrl,
          };
        }
        hasMore = docs.length === SEARCH_PAGE_SIZE;
        page += 1;
      }
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetchWithRetry(
        `${OPEN_LIBRARY_API}/search.json?q=subject_key:architecture&limit=1`,
        connectorFetchOptions(),
      );
      if (!res.ok) return false;
      const data = (await res.json()) as SearchResponse;
      return Array.isArray(data.docs);
    } catch {
      return false;
    }
  }
}
