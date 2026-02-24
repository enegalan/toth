import type { RawEditionRecord, SourceConnector } from '@toth/shared';
import { connectorFetchOptions, delayBetweenPages, fetchWithRetry } from './http';

const SEARCH_BASE = 'https://www.gutenberg.org/ebooks/search/';
const PAGE_SIZE = 25;
const DELAY_BETWEEN_PAGES_MS = 1500;
const EPUB_URL_TEMPLATE = 'https://www.gutenberg.org/cache/epub/{id}/pg{id}-images.epub';
const COVER_URL_TEMPLATE = 'https://www.gutenberg.org/cache/epub/{id}/pg{id}.cover.medium.jpg';

/** Match <a href=".../ebooks/123">Title</a> or similar; captures id and link text. */
const BOOK_LINK_REGEX =
  /<a\s[^>]*href=["'](?:https?:\/\/[^"']*)?\/ebooks\/(\d+)(?:\?[^"']*)?["'][^>]*>([\s\S]*?)<\/a>/gi;

interface ScrapedBook {
  id: string;
  title: string;
  authors: string[];
}

function buildSearchUrl(startIndex: number): string {
  const params = new URLSearchParams();
  params.set('query', '');
  params.set('sort_order', 'downloads');
  params.set('start_index', String(startIndex));
  return `${SEARCH_BASE}?${params.toString()}`;
}

function buildEpubUrl(id: string): string {
  return EPUB_URL_TEMPLATE.replace(/\{id\}/g, id);
}

function buildCoverUrl(id: string): string {
  return COVER_URL_TEMPLATE.replace(/\{id\}/g, id);
}

/**
 * Parse search results HTML. Extracts book ID and title from each link to /ebooks/N.
 * Link text often includes "Title Author Name NNN downloads"; we strip the downloads
 * count and the author so the title is correct and will be updated on re-ingestion.
 */
function parseSearchResults(html: string): ScrapedBook[] {
  const books: ScrapedBook[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  BOOK_LINK_REGEX.lastIndex = 0;
  while ((m = BOOK_LINK_REGEX.exec(html)) !== null) {
    const id = m[1];
    if (seen.has(id)) continue;
    seen.add(id);
    const authors = parseAuthorsFromRow(html, m.index, m[0].length);
    const rawTitle = m[2].replace(/<[^>]+>/g, '').trim();
    const title = cleanTitleFromLinkText(rawTitle, authors);
    books.push({ id, title, authors });
  }
  return books;
}

/**
 * Link text is often "Title Author Name NNN downloads". Remove the trailing
 * " NNN downloads" and then the author name so we store only the title.
 */
function cleanTitleFromLinkText(rawTitle: string, authors: string[]): string {
  const withoutDownloads = rawTitle.replace(/\s+\d+\s*downloads?\s*$/i, '').trim();
  if (!withoutDownloads) return rawTitle || 'Unknown';
  const author = authors[0];
  if (!author || author === 'Unknown') return withoutDownloads;
  const escapedAuthor = author.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const withoutAuthor = withoutDownloads.replace(
    new RegExp(`\\s*${escapedAuthor}\\s*$`, 'i'),
    '',
  ).trim();
  return withoutAuthor || withoutDownloads;
}

/**
 * Try to extract author from the same result row (text after the link, or last segment of title).
 */
function parseAuthorsFromRow(
  html: string,
  linkStart: number,
  linkLength: number,
): string[] {
  const after = html.slice(linkStart + linkLength, linkStart + linkLength + 400);
  const stripTags = after.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const digitsMatch = stripTags.match(/\d+\s*downloads?/i);
  const beforeDownloads = digitsMatch
    ? stripTags.slice(0, stripTags.indexOf(digitsMatch[0])).trim()
    : stripTags.slice(0, 200).trim();
  if (!beforeDownloads) return ['Unknown'];
  const trimmed = beforeDownloads.replace(/^[\s,;|]+|[\s,;|]+$/g, '').trim();
  if (!trimmed) return ['Unknown'];
  return [trimmed];
}

export class GutenbergConnector implements SourceConnector {
  constructor(public readonly sourceId: string) {}

  async *fetchCatalog(): AsyncGenerator<RawEditionRecord, void, unknown> {
    const opts = connectorFetchOptions();
    let startIndex = 0;
    let hasMore = true;
    let firstPage = true;
    while (hasMore) {
      if (!firstPage) await delayBetweenPages(DELAY_BETWEEN_PAGES_MS);
      firstPage = false;
      const url = buildSearchUrl(startIndex);
      const res = await fetchWithRetry(url, opts);
      if (!res.ok) {
        if (res.status === 400 || res.status === 404) {
          break;
        }
        throw new Error(`Gutenberg search error: ${res.status}`);
      }
      const html = await res.text();
      const books = parseSearchResults(html);
      if (books.length === 0) break;
      for (const book of books) {
        yield {
          source_id: this.sourceId,
          external_id: book.id,
          title: book.title,
          authors: book.authors,
          language: 'en',
          description: null,
          subjects: [],
          license: 'public-domain',
          download_url: buildEpubUrl(book.id),
          file_size: null,
          published_date: null,
          cover_url: buildCoverUrl(book.id),
        };
      }
      if (books.length < PAGE_SIZE) hasMore = false;
      else startIndex += PAGE_SIZE;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetchWithRetry(
        buildSearchUrl(0),
        connectorFetchOptions(),
      );
      return res.ok;
    } catch {
      return false;
    }
  }
}