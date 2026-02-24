import type { RawEditionRecord, SourceConnector } from '@toth/shared';
import {
  DELAY_BETWEEN_BOOK_PAGES_MS,
  DELAY_BETWEEN_PAGES_MS,
  connectorFetchOptions,
  delayBetweenPages,
  fetchWithRetry,
  throttle,
} from './http';

const BASE = 'https://epub.gratis';
const LISTING_PAGE_1 = `${BASE}/?s=`;
const MAX_PAGES = 100;

/**
 * Parse listing page: extract book URLs (same-origin /book/ only), titles, and cover URLs.
 * Articles are in order: we match book links and pair with the preceding img when in same article.
 */
function parseListingPage(html: string): Array<{ url: string; slug: string; title: string; coverUrl: string | null }> {
  const results: Array<{ url: string; slug: string; title: string; coverUrl: string | null }> = [];
  const seen = new Set<string>();

  const articleRegex = /<article[^>]*class="[^"]*elementor-post[^"]*"[\s\S]*?<\/article>/gi;
  let art: RegExpExecArray | null;
  while ((art = articleRegex.exec(html)) !== null) {
    const block = art[0];
    const linkMatch = /href=["'](https:\/\/epub\.gratis\/book\/([^"'?#]+))(?:\/[?"']|["'])/i.exec(block);
    if (!linkMatch) continue;
    const url = linkMatch[1].replace(/\/?$/, '/');
    const slug = linkMatch[2].replace(/\/$/, '');
    if (seen.has(slug)) continue;
    seen.add(slug);

    const titleMatch = /<h3[^>]*class="[^"]*elementor-post__title[^"]*"[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>\s*<\/h3>/i.exec(block);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() || slug : slug;

    const imgMatch = /<img[^>]+src=["'](https:\/\/epub\.gratis\/wp-content\/uploads\/[^"']+)["']/i.exec(block);
    const coverUrl = imgMatch ? imgMatch[1] : null;

    results.push({ url, slug, title, coverUrl });
  }

  return results;
}

function buildListingUrl(page: number): string {
  if (page <= 1) return LISTING_PAGE_1;
  return `${BASE}/page/${page}/?s`;
}

/**
 * Parse book detail page for author (Editores) and download link (EPUB or first download link).
 */
function parseBookPage(html: string, bookUrl: string): { authors: string[]; downloadUrl: string | null } {
  const authors: string[] = [];
  const editorsBlock = /mbm-book-details-editors-data[\s\S]*?<span class="mbm-book-details-genres-label"/i.exec(html);
  if (editorsBlock) {
    const editorLinks = editorsBlock[0].matchAll(/<a[^>]+href="[^"]*"[^>]*>([^<]+)<\/a>/g);
    for (const m of editorLinks) {
      const name = m[1].trim();
      if (name && !authors.includes(name)) authors.push(name);
    }
  }
  if (authors.length === 0) authors.push('Unknown');

  const downloadLinkRegex = /<a[^>]+class="[^"]*mbm-book-download-links-link[^"]*"[^>]+href=["']([^"']+)["']/gi;
  const hrefs: string[] = [];
  let linkMatch: RegExpExecArray | null;
  while ((linkMatch = downloadLinkRegex.exec(html)) !== null) {
    if (linkMatch[1]) hrefs.push(linkMatch[1]);
  }
  const downloadUrl =
    hrefs.find((h) => h.includes('epub') || h.endsWith('.epub')) ?? hrefs[0] ?? bookUrl;

  return { authors, downloadUrl };
}

export class EpubGratisConnector implements SourceConnector {
  constructor(public readonly sourceId: string) {}

  async *fetchCatalog(): AsyncGenerator<RawEditionRecord, void, unknown> {
    const opts = connectorFetchOptions();
    const seenSlugs = new Set<string>();
    let firstPage = true;

    for (let page = 1; page <= MAX_PAGES; page++) {
      if (!firstPage) await delayBetweenPages(DELAY_BETWEEN_PAGES_MS);
      firstPage = false;

      const url = buildListingUrl(page);
      const res = await fetchWithRetry(url, opts);
      if (!res.ok) {
        if (res.status === 404) break;
        throw new Error(`Epub.gratis listing error: ${res.status}`);
      }
      const html = await res.text();
      const items = parseListingPage(html);
      if (items.length === 0) break;

      for (const item of items) {
        if (seenSlugs.has(item.slug)) continue;
        seenSlugs.add(item.slug);

        await throttle(DELAY_BETWEEN_BOOK_PAGES_MS);
        const bookRes = await fetchWithRetry(item.url, opts);
        let authors = ['Unknown'];
        let downloadUrl = item.url;
        if (bookRes.ok) {
          const bookHtml = await bookRes.text();
          const parsed = parseBookPage(bookHtml, item.url);
          authors = parsed.authors;
          downloadUrl = parsed.downloadUrl ?? item.url;
        }

        yield {
          source_id: this.sourceId,
          external_id: item.slug,
          title: item.title,
          authors,
          language: 'es',
          description: null,
          subjects: [],
          license: 'public-domain',
          download_url: downloadUrl,
          file_size: null,
          published_date: null,
          cover_url: item.coverUrl,
        };
      }
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetchWithRetry(
        LISTING_PAGE_1,
        connectorFetchOptions(),
      );
      return res.ok;
    } catch {
      return false;
    }
  }
}
