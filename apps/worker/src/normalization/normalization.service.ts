import { Injectable } from '@nestjs/common';
import type { RawEditionRecord } from '@toth/shared';
import { SUPPORTED_LICENSES } from '@toth/shared';

export interface NormalizedRecord {
  title: string;
  authors: string[];
  language: string;
  description: string | null;
  subjects: string[];
  license: string;
  download_url: string;
  file_size: number | null;
  published_date: string | null;
  cover_url: string | null;
  source_id: string;
  external_id: string;
}

const LANGUAGE_MAP: Record<string, string> = {
  en: 'en',
  eng: 'en',
  english: 'en',
  fr: 'fr',
  fra: 'fr',
  french: 'fr',
  de: 'de',
  ger: 'de',
  german: 'de',
  es: 'es',
  spa: 'es',
  spanish: 'es',
  it: 'it',
  ita: 'it',
  italian: 'it',
  pt: 'pt',
  por: 'pt',
  portuguese: 'pt',
};

const LICENSE_MAP: Record<string, string> = {
  'public domain': 'public-domain',
  'public-domain': 'public-domain',
  pd: 'public-domain',
  cc0: 'cc0',
  'cc-0': 'cc0',
  'cc by': 'cc-by',
  'cc-by': 'cc-by',
  'cc by-sa': 'cc-by-sa',
  'cc-by-sa': 'cc-by-sa',
  gutenberg: 'gutenberg',
};

@Injectable()
export class NormalizationService {
  normalize(record: RawEditionRecord): NormalizedRecord {
    return {
      title: this.normalizeTitle(record.title),
      authors: record.authors.map((a) => this.normalizeAuthor(a)),
      language: this.normalizeLanguage(record.language),
      description: record.description
        ? this.normalizeDescription(record.description)
        : null,
      subjects: record.subjects.map((s) => s.trim().slice(0, 200)).filter(Boolean),
      license: this.normalizeLicense(record.license),
      download_url: record.download_url.trim().slice(0, 2048),
      file_size: record.file_size,
      published_date: record.published_date?.trim().slice(0, 50) ?? null,
      cover_url: record.cover_url?.trim().slice(0, 2048) ?? null,
      source_id: record.source_id,
      external_id: record.external_id,
    };
  }

  private normalizeTitle(title: string): string {
    return title
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 1000);
  }

  private normalizeAuthor(name: string): string {
    return name
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/,/g, '')
      .slice(0, 500);
  }

  private normalizeLanguage(lang: string): string {
    const key = lang.trim().toLowerCase().slice(0, 20);
    return LANGUAGE_MAP[key] ?? (key.slice(0, 2) || 'en');
  }

  private normalizeDescription(desc: string): string {
    const decoded = this.decodeHtmlEntities(desc);
    const plain = this.stripHtmlToPlainText(decoded);
    return plain.trim().replace(/\s+/g, ' ').slice(0, 10000);
  }

  private decodeHtmlEntities(s: string): string {
    return s
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/gi, "'")
      .replace(/&#x27;/gi, "'")
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
      .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
        String.fromCharCode(parseInt(code, 16)),
      );
  }

  private stripHtmlToPlainText(s: string): string {
    let t = s
      .replace(/<\/p>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/li>/gi, '\n');
    t = t.replace(/<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)');
    t = t.replace(/<[^>]+>/g, '');
    return t.replace(/\n+/g, '\n').trim();
  }

  private normalizeLicense(license: string): string {
    const key = license.trim().toLowerCase().replace(/-/g, ' ');
    const mapped = LICENSE_MAP[key];
    if (mapped) return mapped;
    const lower = license.trim().toLowerCase().slice(0, 100);
    return SUPPORTED_LICENSES.includes(lower as typeof SUPPORTED_LICENSES[number])
      ? lower
      : 'public-domain';
  }
}
