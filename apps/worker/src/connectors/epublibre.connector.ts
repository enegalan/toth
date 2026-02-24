import type { RawEditionRecord, SourceConnector } from '@toth/shared';
import {
  DELAY_BETWEEN_BOOK_PAGES_MS,
  DELAY_BETWEEN_PAGES_MS,
  connectorFetchOptions,
  delayBetweenPages,
  fetchWithRetry,
  throttle,
} from './http';

const BASE = 'https://epublibre.bid';
const LISTING_PAGE_1 = `${BASE}/?s=`;
const MAX_PAGES = 100;

interface ListingItem {
  url: string;
  slug: string;
  title: string;
  author: string;
  coverUrl: string | null;
}

/**
 * Parse Elementor archive: extract book URLs (same-origin), titles, authors, covers.
 * Matches article/div with elementor-post and link to epublibre.bid.
 */
function parseListingPage(html: string): ListingItem[] {
  const results: ListingItem[] = [];
  const seen = new Set<string>();

  const articleRegex = /<article[^>]*class="[^"]*elementor-post[^"]*"[\s\S]*?<\/article>/gi;
  let art: RegExpExecArray | null;
  while ((art = articleRegex.exec(html)) !== null) {
    const block = art[0];
    const linkMatch = /href=["'](https:\/\/epublibre\.bid\/[^"'?#]*\/?)["']/i.exec(block);
    if (!linkMatch) continue;
    let url = linkMatch[1].replace(/\/?$/, '/');
    const pathname = url.replace(/^https?:\/\/[^/]+/, '') || '/';
    const slug = pathname.replace(/^\/|\/$/g, '').split('/').filter(Boolean).pop() ?? pathname.replace(/\//g, '-');
    if (seen.has(slug)) continue;
    seen.add(slug);

    const titleMatch = /<h3[^>]*class="[^"]*elementor-post__title[^"]*"[^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>\s*<\/h3>/i.exec(block)
      ?? /<h[23][^>]*>\s*<a[^>]*>([\s\S]*?)<\/a>\s*<\/h[23]>/i.exec(block);
    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() || slug : slug;

    const authorMatch = /<span[^>]*class="[^"]*elementor-post-author[^"]*"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i.exec(block)
      ?? /class="[^"]*author[^"]*"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i.exec(block);
    const author = authorMatch ? authorMatch[1].trim() : 'Unknown';

    const imgMatch = /<img[^>]+src=["']([^"']+)["']/i.exec(block);
    const coverUrl = imgMatch ? imgMatch[1] : null;

    results.push({ url, slug, title, author, coverUrl });
  }

  if (results.length > 0) return results;

  const divPostRegex = /<div[^>]*class="[^"]*elementor-post[^"]*"[^>]*>[\s\S]*?<\/div>\s*(?=<div|$)/gi;
  let divMatch: RegExpExecArray | null;
  while ((divMatch = divPostRegex.exec(html)) !== null) {
    const block = divMatch[0];
    const linkMatch = /href=["'](https:\/\/epublibre\.bid\/[^"'?#]*\/?)["']/i.exec(block);
    if (!linkMatch) continue;
    let url = linkMatch[1].replace(/\/?$/, '/');
    const pathname = url.replace(/^https?:\/\/[^/]+/, '') || '/';
    const slug = pathname.replace(/^\/|\/$/g, '').split('/').filter(Boolean).pop() ?? pathname.replace(/\//g, '-');
    if (seen.has(slug)) continue;
    seen.add(slug);

    const titleMatch = /<a[^>]+href=["'][^"']*["'][^>]*>([\s\S]*?)<\/a>/i.exec(block);
    const rawTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';
    const title = rawTitle || slug;

    results.push({ url, slug, title, author: 'Unknown', coverUrl: null });
  }

  return results;
}

function buildListingUrl(page: number): string {
  if (page <= 1) return LISTING_PAGE_1;
  return `${BASE}/page/${page}/?s=`;
}

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
  const authorLinkRegex = /<a[^>]+href="[^"]*"[^>]*class="[^"]*author[^"]*"[^>]*>([^<]+)<\/a>/gi;
  let authorMatch: RegExpExecArray | null;
  while ((authorMatch = authorLinkRegex.exec(html)) !== null) {
    const name = authorMatch[1].trim();
    if (name && !authors.includes(name)) authors.push(name);
  }
  if (authors.length === 0) authors.push('Unknown');

  const downloadLinkRegex = /<a[^>]+class="[^"]*mbm-book-download-links-link[^"]*"[^>]+href=["']([^"']+)["']/gi;
  const hrefs: string[] = [];
  let linkMatch: RegExpExecArray | null;
  while ((linkMatch = downloadLinkRegex.exec(html)) !== null) {
    if (linkMatch[1]) hrefs.push(linkMatch[1]);
  }
  if (hrefs.length === 0) {
    const epubMatch = /<a[^>]+href=["']([^"']+\.epub)["']/gi.exec(html);
    if (epubMatch) hrefs.push(epubMatch[1]);
  }
  const downloadUrl =
    hrefs.find((h) => h.includes('epub') || h.endsWith('.epub')) ?? hrefs[0] ?? bookUrl;

  return { authors, downloadUrl };
}

export class EpublibreConnector implements SourceConnector {
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
        throw new Error(`ePubLibre listing error: ${res.status}`);
      }
      const html = await res.text();
      const items = parseListingPage(html);
      if (items.length === 0) break;

      for (const item of items) {
        if (seenSlugs.has(item.slug)) continue;
        seenSlugs.add(item.slug);

        await throttle(DELAY_BETWEEN_BOOK_PAGES_MS);
        let authors = [item.author];
        let downloadUrl = item.url;
        const bookRes = await fetchWithRetry(item.url, opts);
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
      const res = await fetchWithRetry(LISTING_PAGE_1, connectorFetchOptions());
      return res.ok;
    } catch {
      return false;
    }
  }
}
