'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  getWork,
  getWorkRatings,
  rateWork,
  removeWorkRating,
  checkSaved,
  addSaved,
  removeSaved,
} from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';
import { Skeleton } from '@/components/Skeleton';

function BookIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.2}
      stroke="currentColor"
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
      />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={className}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
      />
    </svg>
  );
}

function WorkSkeleton() {
  return (
    <main className="min-h-[60vh]">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <div className="mb-6">
          <Skeleton className="h-5 w-24 rounded" />
        </div>
        <div className="flex flex-col gap-8 sm:flex-row sm:gap-10">
          <Skeleton className="h-72 w-44 shrink-0 rounded-2xl sm:h-80 sm:w-52" />
          <div className="min-w-0 flex-1 space-y-4">
            <Skeleton className="h-8 w-3/4 rounded-lg sm:h-9" />
            <Skeleton className="h-5 w-1/2 rounded" />
            <div className="flex flex-wrap gap-2 pt-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-7 w-16 rounded-full" />
              ))}
            </div>
            <div className="flex gap-4 pt-4">
              <Skeleton className="h-6 w-20 rounded" />
              <Skeleton className="h-8 w-32 rounded-lg" />
            </div>
          </div>
        </div>
        <div className="mt-10 space-y-3">
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-5/6 rounded" />
          <Skeleton className="h-4 w-4/5 rounded" />
        </div>
      </div>
    </main>
  );
}

export default function WorkDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { user } = useAuth();
  const [work, setWork] = useState<Awaited<ReturnType<typeof getWork>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ratings, setRatings] = useState<{
    average: number;
    count: number;
    userRating?: number;
  } | null>(null);
  const [saved, setSaved] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [saveSubmitting, setSaveSubmitting] = useState(false);

  const loadRatings = useCallback(() => {
    if (!id) return;
    getWorkRatings(id)
      .then(setRatings)
      .catch(() => setRatings({ average: 0, count: 0 }));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getWork(id)
      .then(setWork)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    loadRatings();
  }, [id, loadRatings]);

  useEffect(() => {
    if (!id || !user) return;
    checkSaved(id).then((r) => setSaved(r.saved)).catch(() => setSaved(false));
  }, [id, user]);

  async function handleRate(score: number) {
    if (!id || !user || ratingSubmitting) return;
    const isRemoving = ratings?.userRating === score;
    setRatingSubmitting(true);
    try {
      if (isRemoving) {
        const r = await removeWorkRating(id);
        setRatings({
          ...r,
          userRating: undefined,
        });
      } else {
        const r = await rateWork(id, score);
        setRatings({
          average: r.average,
          count: r.count,
          userRating: r.userRating,
        });
      }
    } finally {
      setRatingSubmitting(false);
    }
  }

  async function handleToggleSaved() {
    if (!id || !user || saveSubmitting) return;
    setSaveSubmitting(true);
    try {
      if (saved) {
        await removeSaved(id);
        setSaved(false);
      } else {
        await addSaved(id);
        setSaved(true);
      }
    } finally {
      setSaveSubmitting(false);
    }
  }

  if (loading) {
    return <WorkSkeleton />;
  }

  if (error || !work) {
    return (
      <main className="min-h-[50vh] px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-md">
          <div className="rounded-2xl border border-red-200/80 bg-red-50/80 p-6 shadow-card">
            <p className="text-red-800 font-medium">{error ?? 'Work not found'}</p>
            <p className="mt-1 text-sm text-red-700/90">
              The book may have been removed or the link is invalid.
            </p>
            <Link
              href="/search"
              className="btn-primary mt-5 inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium shadow-card transition hover:shadow-card-hover"
            >
              Back to search
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[60vh]">
      <article className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:py-10">
        <Link
          href="/search"
          className="mb-6 inline-flex items-center text-sm font-medium text-stone-600 transition-colors hover:text-stone-900 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 rounded-lg px-1 -ml-1"
        >
          ← Back to search
        </Link>

        <div className="flex flex-col gap-8 sm:flex-row sm:gap-10">
          <div className="shrink-0">
            {work.cover_url ? (
              <img
                src={work.cover_url}
                alt=""
                className="h-72 w-44 rounded-2xl object-cover shadow-card ring-1 ring-black/5 sm:h-80 sm:w-52"
              />
            ) : (
              <div
                className="flex h-72 w-44 flex-col items-center justify-center gap-2 rounded-2xl bg-brand-100 text-brand-600 ring-1 ring-black/5 sm:h-80 sm:w-52"
                aria-hidden
              >
                <BookIcon className="h-14 w-14 opacity-60" />
                <span className="text-xs font-medium">No cover</span>
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
              {work.canonical_title}
            </h1>
            <p className="mt-2">
              <span className="text-stone-500">by </span>
              <Link
                href={`/authors/${work.author.id}`}
                className="font-medium text-stone-800 underline decoration-stone-300 underline-offset-2 transition-colors hover:text-stone-900 hover:decoration-stone-500"
              >
                {work.author.canonical_name}
              </Link>
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700">
                {work.language}
              </span>
              {work.subjects.slice(0, 5).map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-600"
                >
                  {s}
                </span>
              ))}
            </div>

            {(work.view_count > 0 || work.saved_count > 0) && (
              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-stone-500">
                {work.view_count > 0 && (
                  <span>
                    {work.view_count} view{work.view_count !== 1 ? 's' : ''}
                  </span>
                )}
                {work.saved_count > 0 && (
                  <span>
                    Saved by {work.saved_count} user{work.saved_count !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}

            {ratings && (
              <div
                className="mt-4 flex flex-wrap items-center gap-2"
                role="group"
                aria-label={user ? 'Rate this work' : 'Rating'}
              >
                <span className="text-sm font-medium text-stone-700">
                  {ratings.average > 0 ? `${ratings.average.toFixed(1)}` : '—'}
                </span>
                {user ? (
                  [1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleRate(star)}
                      disabled={ratingSubmitting}
                      className={`rounded p-1 text-lg leading-none transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 disabled:opacity-50 ${
                        (ratings.userRating ?? 0) >= star
                          ? 'text-amber-500'
                          : 'text-stone-300 hover:text-amber-400'
                      }`}
                      aria-pressed={(ratings.userRating ?? 0) >= star}
                      aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                    >
                      ★
                    </button>
                  ))
                ) : (
                  <div className="flex items-center gap-0.5" aria-hidden>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={`text-lg leading-none ${
                          ratings.average >= star ? 'text-amber-400/80' : 'text-stone-200'
                        }`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                )}
                <span className="text-sm text-stone-500">
                  {ratings.count > 0
                    ? `${ratings.count} rating${ratings.count !== 1 ? 's' : ''}`
                    : 'No ratings yet'}
                </span>
              </div>
            )}

            {user && (
              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleToggleSaved}
                  disabled={saveSubmitting}
                  aria-label={saved ? 'Remove from saved' : 'Save for later'}
                  title={saved ? 'Remove from saved' : 'Save for later'}
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 disabled:opacity-50 ${
                    saved
                      ? 'border-brand-300 bg-brand-100 text-brand-800 hover:bg-brand-200'
                      : 'border-stone-200 bg-white text-stone-700 shadow-card hover:border-stone-300 hover:bg-stone-50 hover:shadow-card-hover'
                  }`}
                >
                  {saveSubmitting ? (
                    <Skeleton className="inline-block h-5 w-5 rounded" />
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill={saved ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      strokeWidth={saved ? 0 : 2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5 shrink-0"
                      aria-hidden
                    >
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                    </svg>
                  )}
                  <span>{saved ? 'Saved' : 'Save for later'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {work.description && (
          <section className="mt-10">
            <div className="card p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">
                Description
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-stone-700 leading-relaxed">
                {work.description}
              </p>
            </div>
          </section>
        )}

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-stone-900">Editions</h2>
          <p className="mt-1 text-sm text-stone-500">
            Legal editions from trusted sources. Download links go to the original provider.
          </p>
          <ul className="mt-5 space-y-3">
            {work.editions.map((edition) => (
              <li key={edition.id} className="card overflow-hidden p-0">
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div className="min-w-0">
                    <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                      {edition.license}
                    </span>
                    <p className="mt-2 text-sm font-medium text-stone-700">
                      {edition.source.name}
                    </p>
                  </div>
                  <a
                    href={edition.download_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium shadow-card transition hover:shadow-card-hover focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
                  >
                    <DownloadIcon className="h-5 w-5" />
                    Download EPUB
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </article>
    </main>
  );
}
