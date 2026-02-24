'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAuthor } from '@/lib/api';
import { search } from '@/lib/api';

export default function AuthorDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [author, setAuthor] = useState<Awaited<ReturnType<typeof getAuthor>> | null>(null);
  const [works, setWorks] = useState<Awaited<ReturnType<typeof search>>['works']>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    getAuthor(id)
      .then((a) => {
        setAuthor(a);
        return search({ author_id: id, limit: 50 });
      })
      .then((r) => setWorks(r.works))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <main>
        <div className="mx-auto max-w-4xl px-4 py-12 text-center text-stone-500">
          Loading…
        </div>
      </main>
    );
  }

  if (error || !author) {
    return (
      <main>
        <div className="mx-auto max-w-4xl px-4 py-12">
          <div className="rounded bg-red-50 px-4 py-3 text-red-800">
            {error ?? 'Author not found'}
          </div>
          <Link href="/search" className="mt-4 inline-block text-stone-600 underline">
            Back to search
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Link href="/search" className="mb-6 inline-block text-sm text-stone-600 underline">
          Back to search
        </Link>

        <h1 className="text-2xl font-bold text-stone-900">{author.canonical_name}</h1>
        {(author.birth_year != null || author.death_year != null) && (
          <p className="mt-1 text-stone-600">
            {[author.birth_year, author.death_year].filter(Boolean).join(' – ')}
          </p>
        )}

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-stone-800">Works</h2>
          <ul className="mt-4 space-y-2">
            {works.map((w) => (
              <li key={w.id}>
                <Link
                  href={`/works/${w.id}`}
                  className="block rounded border border-stone-200 bg-white px-4 py-3 text-stone-800 hover:bg-stone-50"
                >
                  {w.canonical_title}
                </Link>
              </li>
            ))}
          </ul>
          {works.length === 0 && (
            <p className="text-stone-500">No works found for this author.</p>
          )}
        </section>
      </div>
    </main>
  );
}
