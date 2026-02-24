'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { search as searchApi, getSubjects } from '@/lib/api';

function parsePageParam(value: string | null): number {
  const n = parseInt(value || '1', 10);
  return Number.isNaN(n) || n < 1 ? 1 : n;
}

type ViewMode = 'grid' | 'list';

const VIEW_MODE_KEY = 'toth-search-view';
const PAGE_SIZE = 20;

const LANGUAGE_LABELS: Record<string, string> = {
  en: 'English',
  fr: 'French',
  de: 'German',
  es: 'Spanish',
};

function getStoredViewMode(): ViewMode {
  if (typeof window === 'undefined') return 'list';
  const stored = window.localStorage.getItem(VIEW_MODE_KEY);
  return stored === 'grid' || stored === 'list' ? stored : 'list';
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = useMemo(
    () => parsePageParam(searchParams.get('page')),
    [searchParams],
  );

  const [q, setQ] = useState('');
  const [language, setLanguage] = useState('');
  const [subject, setSubject] = useState('');
  const [subjectsList, setSubjectsList] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const inputRef = useRef<HTMLInputElement>(null);

  const setSearchPage = useCallback(
    (nextPage: number) => {
      const p = Math.max(1, nextPage);
      const url = p === 1 ? '/search' : `/search?page=${p}`;
      router.replace(url);
    },
    [router],
  );

  useEffect(() => {
    setViewMode(getStoredViewMode());
  }, []);

  useEffect(() => {
    setSubject(searchParams.get('subject') ?? '');
  }, [searchParams]);

  useEffect(() => {
    getSubjects()
      .then(setSubjectsList)
      .catch(() => setSubjectsList([]));
  }, []);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    total: number;
    works: Array<{
      id: string;
      canonical_title: string;
      author_name: string;
      author_id: string;
      language: string;
      licenses: string[];
      source_ids: string[];
      cover_url: string | null;
    }>;
  } | null>(null);

  const runSearch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const offset = (page - 1) * PAGE_SIZE;
    try {
      const data = await searchApi({
        q: q || undefined,
        language: language || undefined,
        subject: subject || undefined,
        limit: PAGE_SIZE,
        offset,
      });
      setResult({ total: data.total, works: data.works });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [q, language, subject, page]);

  useEffect(() => {
    const hasQuery = q.length >= 2;
    const hasFilters = !!language || !!subject;
    const browse = !hasQuery && !hasFilters;
    if (browse) {
      runSearch();
      return;
    }
    const t = setTimeout(runSearch, 300);
    return () => clearTimeout(t);
  }, [q, language, runSearch]);

  const setViewModeAndPersist = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(VIEW_MODE_KEY, mode);
    }
  }, []);

  const hasActiveFilters = !!language || !!subject;
  const clearFilters = useCallback(() => {
    setLanguage('');
    setSubject('');
    router.replace('/search');
  }, [router]);

  const updateSubject = useCallback(
    (value: string) => {
      setSubject(value);
      const params = new URLSearchParams();
      if (value) params.set('subject', value);
      router.replace(params.toString() ? `/search?${params}` : '/search');
    },
    [router],
  );

  const LANG_OPTIONS = [
    { value: '', label: 'Any' },
    { value: 'en', label: 'EN' },
    { value: 'fr', label: 'FR' },
    { value: 'de', label: 'DE' },
    { value: 'es', label: 'ES' },
  ];

  return (
    <main className="min-h-screen bg-[#faf9f7]">
      <div className="mx-auto max-w-4xl px-4 pt-8 pb-12 sm:pt-12 sm:pb-16">
        <header className="mb-10 text-center sm:mb-12">
          <h1 className="text-2xl font-bold tracking-tight text-stone-800 sm:text-3xl">
            Find your next read
          </h1>
          <p className="mt-2 text-stone-500 sm:text-lg">
            Search by title or author, or browse by topic.
          </p>
        </header>

        <form
          className="mb-8"
          onSubmit={(e) => { e.preventDefault(); runSearch(); inputRef.current?.blur(); }}
        >
          <div className="flex items-center overflow-hidden rounded-full border border-stone-200/80 bg-white py-1.5 pl-6 pr-2 shadow-search transition-shadow focus-within:border-primary-400 focus-within:shadow-search-focus sm:py-2 sm:pl-7 sm:pr-2.5">
            <div className="flex shrink-0 items-center text-stone-400" aria-hidden>
              <SearchIcon className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <label htmlFor="search-q" className="sr-only">
              Search by title or author
            </label>
            <input
              ref={inputRef}
              id="search-q"
              type="search"
              className="search-bar-input min-w-0 flex-1 py-3 pl-3 pr-2 text-base text-stone-800 outline-none placeholder:text-stone-400 focus:ring-0 sm:py-3.5 sm:pl-4 sm:text-lg"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                router.replace('/search');
              }}
              placeholder="Title, author…"
              autoComplete="off"
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                Language
              </span>
              <span className="flex gap-1 rounded-full bg-stone-100/80 p-1">
                {LANG_OPTIONS.map((opt) => (
                  <button
                    key={opt.value || 'any'}
                    type="button"
                    onClick={() => {
                      setLanguage(opt.value);
                      router.replace('/search');
                    }}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition sm:px-4 ${
                      language === opt.value
                        ? 'bg-white text-stone-800 shadow-sm'
                        : 'text-stone-600 hover:text-stone-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="search-subject" className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                Topic
              </label>
              <select
                id="search-subject"
                value={subject}
                onChange={(e) => updateSubject(e.target.value)}
                className="rounded-full border-0 bg-stone-100/80 px-4 py-2 pr-10 text-sm font-medium text-stone-700 transition hover:bg-stone-200/80 focus:border-0 focus:outline-none focus:ring-2 focus:ring-primary-300"
              >
                <option value="">Any</option>
                {subjectsList.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm font-medium text-stone-500 underline-offset-2 hover:text-stone-700 hover:underline focus:outline-none"
              >
                Clear filters
              </button>
            )}
          </div>
        </form>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200/80 bg-red-50/90 px-5 py-4 text-sm text-red-800 shadow-sm">
            {error}
          </div>
        )}

        {loading && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-stone-400" />
              <span className="text-sm text-stone-500">Searching…</span>
            </div>
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <li key={i} className="animate-fade-in flex flex-col overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-card" style={{ animationDelay: `${i * 30}ms` }}>
                  <div className="aspect-[3/4] w-full animate-shimmer rounded-t-2xl bg-stone-100" />
                  <div className="flex flex-1 flex-col gap-2 p-3">
                    <div className="h-4 w-full max-w-[85%] animate-shimmer rounded-lg bg-stone-100" />
                    <div className="h-3 w-2/3 animate-shimmer rounded-lg bg-stone-100" />
                    <div className="mt-2 flex gap-2">
                      <div className="h-5 w-12 animate-shimmer rounded-md bg-stone-100" />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!loading && result && result.works.length === 0 && (
          <div className="animate-fade-in rounded-2xl border border-stone-200/80 bg-white px-6 py-20 text-center shadow-card">
            <p className="text-stone-600">
              No works found. Try different search terms or filters.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 rounded-full bg-primary-50 px-5 py-2.5 text-sm font-medium text-primary-800 transition hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:ring-offset-2"
            >
              Clear filters
            </button>
          </div>
        )}

        {!loading && result && result.works.length > 0 && (
          <div className="animate-fade-in space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-stone-500">
                <span className="font-semibold text-stone-800">{result.total}</span>
                {' '}result{result.total !== 1 ? 's' : ''}
                {hasActiveFilters && (
                  <span className="ml-2 text-stone-400">
                    {language && ` · ${LANGUAGE_LABELS[language] || language}`}
                    {subject && ` · ${subject}`}
                  </span>
                )}
              </p>
              <div
                className="flex rounded-full bg-stone-100/80 p-1"
                role="group"
                aria-label="View mode"
              >
                <button
                  type="button"
                  onClick={() => setViewModeAndPersist('grid')}
                  className={`rounded-full p-2 transition ${
                    viewMode === 'grid'
                      ? 'bg-white text-stone-800 shadow-sm'
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                  aria-label="Grid view"
                  aria-pressed={viewMode === 'grid'}
                >
                  <GridIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewModeAndPersist('list')}
                  className={`rounded-full p-2 transition ${
                    viewMode === 'list'
                      ? 'bg-white text-stone-800 shadow-sm'
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                  aria-label="List view"
                  aria-pressed={viewMode === 'list'}
                >
                  <ListIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            {viewMode === 'grid' ? (
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {result.works.map((work, i) => (
                  <li key={work.id} className="animate-fade-in" style={{ animationDelay: `${Math.min(i * 40, 320)}ms` }}>
                    <Link
                      href={`/works/${work.id}`}
                      className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-card transition-all duration-200 hover:border-brand-200 hover:shadow-card-hover"
                    >
                      {work.cover_url ? (
                        <div className="aspect-[3/4] w-full overflow-hidden">
                          <img
                            src={work.cover_url}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                          />
                        </div>
                      ) : (
                        <div className="flex aspect-[3/4] w-full items-center justify-center bg-stone-100 text-xs text-stone-400" aria-hidden>
                          No cover
                        </div>
                      )}
                      <div className="flex flex-1 flex-col p-3.5">
                        <h2 className="line-clamp-2 font-semibold text-stone-900 text-sm leading-snug group-hover:text-stone-800">
                          {work.canonical_title}
                        </h2>
                        <p className="mt-1 line-clamp-1 text-xs text-stone-600">
                          {work.author_name}
                        </p>
                        <span className="mt-2 inline-flex w-fit rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800/90">
                          {work.language}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="space-y-3">
                {result.works.map((work, i) => (
                  <li key={work.id} className="animate-fade-in" style={{ animationDelay: `${Math.min(i * 30, 240)}ms` }}>
                    <Link
                      href={`/works/${work.id}`}
                      className="group flex gap-4 rounded-2xl border border-stone-200/80 bg-white p-4 shadow-card transition-all duration-200 hover:border-brand-200 hover:shadow-card-hover"
                    >
                      {work.cover_url ? (
                        <div className="h-24 w-16 shrink-0 overflow-hidden rounded-xl sm:h-28 sm:w-20">
                          <img
                            src={work.cover_url}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                          />
                        </div>
                      ) : (
                        <div className="flex h-24 w-16 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-xs text-stone-400 sm:h-28 sm:w-20" aria-hidden>
                          No cover
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h2 className="font-semibold text-stone-900 leading-tight group-hover:text-stone-800">
                          {work.canonical_title}
                        </h2>
                        <p className="mt-0.5 text-sm text-stone-600">
                          {work.author_name}
                        </p>
                        <span className="mt-2 inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800/90">
                          {work.language}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {result.total > PAGE_SIZE && (
              <nav
                className="flex flex-wrap items-center justify-between gap-4 border-t border-stone-200/80 pt-8"
                aria-label="Pagination"
              >
                <p className="text-sm text-stone-500">
                  <span className="font-medium text-stone-700">
                    {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, result.total)}
                  </span>
                  {' '}of <span className="font-medium text-stone-700">{result.total}</span>
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSearchPage(page - 1)}
                    disabled={page <= 1}
                    className="rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 hover:border-stone-300 disabled:pointer-events-none disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:ring-offset-2"
                    aria-label="Previous page"
                  >
                    Previous
                  </button>
                  <span className="px-3 text-sm font-medium text-stone-500" aria-live="polite">
                    {page} / {Math.ceil(result.total / PAGE_SIZE)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSearchPage(page + 1)}
                    disabled={page >= Math.ceil(result.total / PAGE_SIZE)}
                    className="rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 hover:border-stone-300 disabled:pointer-events-none disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:ring-offset-2"
                    aria-label="Next page"
                  >
                    Next
                  </button>
                </div>
              </nav>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function SearchPageFallback() {
  return (
    <main className="min-h-screen bg-[#faf9f7]">
      <div className="mx-auto max-w-4xl px-4 pt-12 pb-16">
        <header className="mb-10 text-center">
          <div className="mx-auto h-8 w-64 animate-pulse rounded-lg bg-stone-200/60" />
          <div className="mx-auto mt-2 h-5 w-80 animate-pulse rounded bg-stone-200/40" />
        </header>
        <div className="mb-8">
          <div className="h-14 w-full animate-pulse rounded-full bg-stone-200/60 sm:h-16" />
          <div className="mt-6 flex gap-4">
            <div className="h-9 w-48 animate-pulse rounded-full bg-stone-200/60" />
            <div className="h-9 w-28 animate-pulse rounded-full bg-stone-200/60" />
          </div>
        </div>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <li key={i} className="flex flex-col overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-card">
              <div className="aspect-[3/4] w-full animate-shimmer bg-stone-100" />
              <div className="flex flex-1 flex-col gap-2 p-3.5">
                <div className="h-4 w-full max-w-[85%] animate-shimmer rounded-lg bg-stone-100" />
                <div className="h-3 w-2/3 animate-shimmer rounded-lg bg-stone-100" />
                <div className="mt-2 h-5 w-12 animate-shimmer rounded-lg bg-stone-100" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchPageFallback />}>
      <SearchPageContent />
    </Suspense>
  );
}
