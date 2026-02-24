'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { getSavedWorks } from '@/lib/api';

type WorkSummary = {
  id: string;
  canonical_title: string;
  author_name: string;
  author_id: string;
  language: string;
  licenses: string[];
  source_ids: string[];
  cover_url: string | null;
  popularity_score: number;
};

export default function SavedPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [works, setWorks] = useState<WorkSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user && !authLoading) {
      router.replace('/login?next=/saved');
      return;
    }
    if (!user) return;
    setLoading(true);
    setError(null);
    getSavedWorks()
      .then((r) => setWorks(r.works))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [user, authLoading, router]);

  if (authLoading || (!user && !error)) {
    return (
      <main>
        <div className="mx-auto max-w-4xl px-4 py-12 text-center text-stone-500">
          Loading…
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <main>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="text-2xl font-bold text-stone-900">Saved for later</h1>
        <p className="mt-1 text-stone-600">
          Books you saved. They appear here until you remove them from the work page.
        </p>

        {error && (
          <div className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-red-800">
            {error}
          </div>
        )}

        {loading && (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[3/4] rounded-xl bg-stone-200 animate-pulse"
              />
            ))}
          </div>
        )}

        {!loading && works.length === 0 && !error && (
          <div className="mt-8 rounded-xl border border-stone-200 bg-white px-6 py-12 text-center text-stone-500">
            No saved books yet. When you’re logged in, use “Save for later” on any
            work page to add it here.
            <div className="mt-4">
              <Link
                href="/search"
                className="text-stone-800 font-medium underline"
              >
                Search books
              </Link>
            </div>
          </div>
        )}

        {!loading && works.length > 0 && (
          <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {works.map((work) => (
              <li key={work.id}>
                <Link
                  href={`/works/${work.id}`}
                  className="flex flex-col rounded-xl border border-stone-200 bg-white shadow-card transition-all hover:border-brand-200 hover:shadow-card-hover"
                >
                  {work.cover_url ? (
                    <img
                      src={work.cover_url}
                      alt=""
                      loading="lazy"
                      className="aspect-[3/4] w-full rounded-t-xl object-cover"
                    />
                  ) : (
                    <div className="aspect-[3/4] w-full rounded-t-xl bg-stone-200 flex items-center justify-center text-stone-400 text-xs">
                      No cover
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-3">
                    <h2 className="line-clamp-2 font-semibold text-stone-900 text-sm">
                      {work.canonical_title}
                    </h2>
                    <p className="mt-1 line-clamp-1 text-xs text-stone-600">
                      {work.author_name}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="rounded bg-stone-100 px-1.5 py-0.5 text-xs text-stone-600">
                        {work.language}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
