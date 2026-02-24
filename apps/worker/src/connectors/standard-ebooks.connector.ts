import type { RawEditionRecord, SourceConnector } from '@toth/shared';
import { connectorFetchOptions, fetchWithRetry, throttle } from './http';

const SE_BASE = 'https://standardebooks.org';
const OPDS_FEED = `${SE_BASE}/feeds/opds`;
const ATOM_NEW_RELEASES = `${SE_BASE}/feeds/atom/new-releases`;
const BROWSE_URL = `${SE_BASE}/ebooks`;
const BROWSE_DELAY_MS = 400;
/** Timeout for entire browse page load (fetch + body); forces skip if server hangs. */
const BROWSE_PAGE_TIMEOUT_MS = 15000;
/** Outer timeout (reject only); ensures we never wait longer even if abort is ignored. */
const BROWSE_PAGE_OUTER_TIMEOUT_MS = 20000;
/** Stop browse after this many consecutive page failures (timeout or error). */
const BROWSE_MAX_CONSECUTIVE_FAILURES = 3;
/** Stop after this many browse pages so we do not loop indefinitely. */
const BROWSE_MAX_PAGES = 80;

const OPDS_IMAGE_RELS = [
  'http://opds-spec.org/image',
  'http://opds-spec.org/image/thumbnail',
  'x-stanza-cover-image',
  'thumbnail',
];

function parseCoverFromEntry(entryXml: string, baseUrl: string): string | null {
  const linkRegex = /<link([^>]+)\/?>/g;
  let m: RegExpExecArray | null;
  while ((m = linkRegex.exec(entryXml)) !== null) {
    const attrs = m[1];
    const rel = (attrs.match(/rel=["']([^"']+)["']/i) ?? [])[1] ?? '';
    const type = (attrs.match(/type=["']([^"']+)["']/i) ?? [])[1] ?? '';
    const href = (attrs.match(/href=["']([^"']+)["']/i) ?? [])[1];
    if (!href) continue;
    const relLower = rel.toLowerCase();
    const isImageRel =
      relLower.includes('image') ||
      relLower.includes('cover') ||
      OPDS_IMAGE_RELS.some((r) => relLower.includes(r.toLowerCase()));
    if (isImageRel || type.startsWith('image/')) {
      return href.startsWith('http') ? href : new URL(href, baseUrl).href;
    }
  }
  return null;
}

/**
 * Standard Ebooks book pages serve cover at /ebooks/.../images/cover.svg.
 * Derive that URL from the epub download URL when the feed has no cover link.
 */
function coverUrlFromEpubUrl(epubUrl: string): string {
  const u = new URL(epubUrl);
  const path = u.pathname.replace(/\/downloads\/[^/]+$/, '');
  return `${u.origin}${path}/images/cover.svg`;
}

/** Slug to title case: "the-cheyne-mystery" -> "The Cheyne Mystery". */
function slugToTitle(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Parse browse HTML for book links (relative /ebooks/... or absolute .../ebooks/...). Returns unique paths (no leading /ebooks/).
 */
function parseBrowsePageLinks(html: string): string[] {
  const seen = new Set<string>();
  const linkRegex =
    /href=["'](?:https:\/\/standardebooks\.org)?\/ebooks\/([^"'?#]+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = linkRegex.exec(html)) !== null) {
    const path = m[1].trim();
    if (path && !path.startsWith('?')) seen.add(path);
  }
  return [...seen];
}

/** Build epub URL and title/author from book path (e.g. "freeman-wills-crofts/the-cheyne-mystery"). */
function pathToRecord(path: string): {
  epubUrl: string;
  coverUrl: string;
  title: string;
  authors: string[];
} {
  const segments = path.split('/').filter(Boolean);
  const epubSlug = segments.join('_');
  const epubUrl = `${SE_BASE}/ebooks/${path}/downloads/${epubSlug}.epub`;
  const coverUrl = `${SE_BASE}/ebooks/${path}/images/cover.svg`;
  const title =
    segments.length >= 2
      ? slugToTitle(segments[segments.length - 1])
      : slugToTitle(segments[0] ?? path);
  const authors =
    segments.length >= 1 ? [slugToTitle(segments[0])] : ['Unknown'];
  return { epubUrl, coverUrl, title, authors };
}

interface ParsedEntry {
  id: string;
  title: string;
  authors: string[];
  language: string;
  summary: string | null;
  subjects: string[];
  epubUrl: string;
  coverUrl: string | null;
  updated: string | null;
}

export class StandardEbooksConnector implements SourceConnector {
  constructor(public readonly sourceId: string) {}

  async *fetchCatalog(): AsyncGenerator<RawEditionRecord, void, unknown> {
    const opts = connectorFetchOptions();
    const opdsRes = await fetchWithRetry(OPDS_FEED, opts);
    let entries: ParsedEntry[];
    let baseUrl: string;
    const seenPaths = new Set<string>();
    if (opdsRes.ok) {
      const text = await opdsRes.text();
      baseUrl = OPDS_FEED;
      entries = this.parseOpdsEntries(text, baseUrl);
    } else if (opdsRes.status === 401 || opdsRes.status === 403) {
      const atomRes = await fetchWithRetry(ATOM_NEW_RELEASES, opts);
      if (!atomRes.ok) {
        throw new Error(
          `Standard Ebooks error: OPDS ${opdsRes.status}, public Atom feed ${atomRes.status}. Full catalog requires Patrons Circle; using public new-releases feed failed.`,
        );
      }
      const text = await atomRes.text();
      baseUrl = ATOM_NEW_RELEASES;
      entries = this.parseAtomEntries(text, baseUrl);
    } else {
      throw new Error(`Standard Ebooks OPDS error: ${opdsRes.status}`);
    }
    for (const entry of entries) {
      const path = this.epubUrlToBookPath(entry.epubUrl);
      if (path) seenPaths.add(path);
      yield {
        source_id: this.sourceId,
        external_id: entry.id,
        title: entry.title,
        authors: entry.authors,
        language: entry.language,
        description: entry.summary ?? null,
        subjects: entry.subjects,
        license: 'public-domain',
        download_url: entry.epubUrl,
        file_size: null,
        published_date: entry.updated ?? null,
        cover_url: entry.coverUrl,
      };
    }
    if (opdsRes.status === 401 || opdsRes.status === 403) {
      yield* this.fetchCatalogFromBrowse(seenPaths);
    }
  }

  /** Extract book path from epub URL for dedupe: "author/title" or "author/title/translator". */
  private epubUrlToBookPath(epubUrl: string): string | null {
    try {
      const p = new URL(epubUrl).pathname;
      const m = /^\/ebooks\/(.+)\/downloads\//.exec(p);
      return m ? m[1] : null;
    } catch {
      return null;
    }
  }

  /** When OPDS is behind auth, scrape the public browse page for the full catalog. */
  private async *fetchCatalogFromBrowse(
    seenPaths: Set<string>,
  ): AsyncGenerator<RawEditionRecord, void, unknown> {
    let page = 1;
    let consecutiveFailures = 0;
    const opts = connectorFetchOptions();
    for (;;) {
      if (page > BROWSE_MAX_PAGES) break;
      await throttle(BROWSE_DELAY_MS);
      const url = `${BROWSE_URL}?page=${page}&per_page=48`;
      let html: string | null = null;
      const controller = new AbortController();
      let innerTimeoutId: ReturnType<typeof setTimeout> | null = null;
      let outerTimeoutId: ReturnType<typeof setTimeout> | null = null;
      const clearTimeouts = (): void => {
        if (innerTimeoutId) {
          clearTimeout(innerTimeoutId);
          innerTimeoutId = null;
        }
        if (outerTimeoutId) {
          clearTimeout(outerTimeoutId);
          outerTimeoutId = null;
        }
      };
      try {
        const result = await Promise.race([
          (async (): Promise<{ html: string | null }> => {
            const res = await fetch(url, {
              ...opts,
              signal: controller.signal,
            });
            clearTimeouts();
            if (!res || !res.ok) return { html: null };
            const body = await res.text();
            return { html: body };
          })(),
          new Promise<never>((_, reject) => {
            innerTimeoutId = setTimeout(() => {
              clearTimeouts();
              controller.abort();
              reject(new Error('Browse page timeout'));
            }, BROWSE_PAGE_TIMEOUT_MS);
          }),
          new Promise<never>((_, reject) => {
            outerTimeoutId = setTimeout(() => {
              clearTimeouts();
              controller.abort();
              reject(new Error('Browse page outer timeout'));
            }, BROWSE_PAGE_OUTER_TIMEOUT_MS);
          }),
        ]);
        html = result.html;
      } catch {
        clearTimeouts();
        consecutiveFailures += 1;
        if (consecutiveFailures >= BROWSE_MAX_CONSECUTIVE_FAILURES) break;
        page += 1;
        continue;
      }
      consecutiveFailures = 0;
      if (html === null) break;
      const paths = parseBrowsePageLinks(html);
      if (paths.length === 0) break;
      for (const path of paths) {
        if (seenPaths.has(path)) continue;
        seenPaths.add(path);
        const { epubUrl, coverUrl, title, authors } = pathToRecord(path);
        yield {
          source_id: this.sourceId,
          external_id: path,
          title,
          authors,
          language: 'en',
          description: null,
          subjects: [],
          license: 'public-domain',
          download_url: epubUrl,
          file_size: null,
          published_date: null,
          cover_url: coverUrl,
        };
      }
      page += 1;
    }
  }

  private parseAtomEntries(xml: string, baseUrl: string): ParsedEntry[] {
    const results: ParsedEntry[] = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    const getTag = (entry: string, tag: string): string | null => {
      const m = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`).exec(entry);
      return m ? m[1].trim() : null;
    };
    let m: RegExpExecArray | null;
    while ((m = entryRegex.exec(xml)) !== null) {
      const entry = m[1];
      const id = getTag(entry, 'id') ?? '';
      const title = getTag(entry, 'title') ?? '';
      const epubLink = (entry.match(/<link[^>]*type=["']application\/epub\+zip["'][^>]*href=["']([^"']+)["']/i) ?? [])[1]
        ?? (entry.match(/<link[^>]*href=["']([^"']+)["'][^>]*type=["']application\/epub\+zip["']/i) ?? [])[1];
      if (!epubLink) continue;
      const authors: string[] = [];
      const authorRegex = /<author>[\s\S]*?<name>([^<]+)<\/name>/g;
      let am: RegExpExecArray | null;
      while ((am = authorRegex.exec(entry)) !== null) authors.push(am[1].trim());
      const summary = getTag(entry, 'content') ?? getTag(entry, 'summary') ?? null;
      const categoryRegex = /<category[^>]*term=["']([^"']+)["']/g;
      const subjects: string[] = [];
      let cm: RegExpExecArray | null;
      while ((cm = categoryRegex.exec(entry)) !== null) subjects.push(cm[1]);
      const updated = getTag(entry, 'updated');
      const epubHref = epubLink.startsWith('http') ? epubLink : new URL(epubLink, baseUrl).href;
      const coverUrl =
        parseCoverFromEntry(entry, baseUrl) ?? coverUrlFromEpubUrl(epubHref);
      results.push({
        id: id || new URL(epubLink).pathname.replace(/\/$/, ''),
        title,
        authors: authors.length ? authors : ['Unknown'],
        language: 'en',
        summary,
        subjects,
        epubUrl: epubHref,
        coverUrl,
        updated,
      });
    }
    return results;
  }

  private parseOpdsEntries(xml: string, baseUrl: string): ParsedEntry[] {
    const results: ParsedEntry[] = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    const getTag = (entry: string, tag: string): string | null => {
      const m = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`).exec(entry);
      return m ? m[1].trim() : null;
    };
    const getAttr = (entry: string, tag: string, attr: string): string | null => {
      const re = new RegExp(`<${tag}[^>]*${attr}=["']([^"']+)["']`);
      const m = re.exec(entry);
      return m ? m[1] : null;
    };
    let m: RegExpExecArray | null;
    while ((m = entryRegex.exec(xml)) !== null) {
      const entry = m[1];
      const id = getTag(entry, 'id') ?? getAttr(entry, 'link', 'href') ?? '';
      const title = getTag(entry, 'title') ?? '';
      const epubLink = (entry.match(/<link[^>]*type=["']application\/epub\+zip["'][^>]*href=["']([^"']+)["']/i) ?? [])[1];
      if (!epubLink) continue;
      const authors: string[] = [];
      const authorRegex = /<author>[\s\S]*?<name>([^<]+)<\/name>/g;
      let am: RegExpExecArray | null;
      while ((am = authorRegex.exec(entry)) !== null) authors.push(am[1].trim());
      const content = getTag(entry, 'content') ?? getTag(entry, 'summary') ?? null;
      const categoryRegex = /<category[^>]*term=["']([^"']+)["']/g;
      const subjects: string[] = [];
      let cm: RegExpExecArray | null;
      while ((cm = categoryRegex.exec(entry)) !== null) subjects.push(cm[1]);
      const updated = getTag(entry, 'updated');
      const epubHref = epubLink.startsWith('http') ? epubLink : new URL(epubLink, baseUrl).href;
      const coverUrl =
        parseCoverFromEntry(entry, baseUrl) ?? coverUrlFromEpubUrl(epubHref);
      results.push({
        id,
        title,
        authors: authors.length ? authors : ['Unknown'],
        language: 'en',
        summary: content,
        subjects,
        epubUrl: epubHref,
        coverUrl,
        updated,
      });
    }
    return results;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const opts = { method: 'HEAD' as const, ...connectorFetchOptions() };
      const opds = await fetchWithRetry(OPDS_FEED, opts);
      if (opds.ok) return true;
      if (opds.status === 401 || opds.status === 403) {
        return (await fetchWithRetry(ATOM_NEW_RELEASES, opts)).ok;
      }
      return false;
    } catch {
      return false;
    }
  }
}
