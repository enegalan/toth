'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getHome } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';

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

function WorkCard({ work }: { work: WorkSummary }) {
  return (
    <Link
      href={`/works/${work.id}`}
      className="flex flex-col rounded-xl border border-stone-200 bg-white shadow-card transition-all hover:border-stone-300 hover:shadow-card-hover"
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
        <h3 className="line-clamp-2 font-semibold text-stone-900 text-sm">
          {work.canonical_title}
        </h3>
        <p className="mt-1 line-clamp-1 text-xs text-stone-600">
          {work.author_name}
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          <span className="rounded bg-stone-100 px-1.5 py-0.5 text-xs text-stone-600">
            {work.language}
          </span>
          {work.licenses.slice(0, 2).map((lic) => (
            <span
              key={lic}
              className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-800"
            >
              {lic}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

function Section({
  title,
  subtitle,
  works,
  loading,
}: {
  title: string;
  subtitle?: string;
  works: WorkSummary[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-8">
        <h2 className="text-xl font-bold text-stone-900">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-stone-500">{subtitle}</p>}
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] rounded-xl bg-stone-200 animate-pulse"
            />
          ))}
        </div>
      </section>
    );
  }
  if (works.length === 0) return null;
  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <h2 className="text-xl font-bold text-stone-900">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-stone-500">{subtitle}</p>}
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {works.map((work) => (
          <WorkCard key={work.id} work={work} />
        ))}
      </div>
    </section>
  );
}

const TOPIC_ACCENTS = [
  'border-l-violet-500 bg-violet-50/50',
  'border-l-amber-500 bg-amber-50/50',
  'border-l-emerald-500 bg-emerald-50/50',
  'border-l-sky-500 bg-sky-50/50',
  'border-l-rose-500 bg-rose-50/50',
  'border-l-teal-500 bg-teal-50/50',
];

function SubjectSection({
  subject,
  works,
  accentIndex,
}: {
  subject: string;
  works: WorkSummary[];
  accentIndex: number;
}) {
  if (works.length === 0) return null;
  const accent = TOPIC_ACCENTS[accentIndex % TOPIC_ACCENTS.length];
  return (
    <div
      className={`rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6 ${accent} border-l-4`}
    >
      <h3 className="text-lg font-semibold tracking-tight text-stone-900">
        {subject}
      </h3>
      <p className="mt-1 text-sm text-stone-500">
        {works.length} {works.length === 1 ? 'work' : 'works'}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {works.map((work) => (
          <WorkCard key={work.id} work={work} />
        ))}
      </div>
    </div>
  );
}

const WHY_TOTH_ITEMS = [
  { title: 'Open formats', description: 'EPUB and open standards; no proprietary readers required.' },
  { title: 'Trusted sources', description: 'Curated catalogs from established, legal providers.' },
  { title: 'Stay organized', description: 'Save works and rate titles when signed in.' },
  { title: 'Direct downloads', description: 'Links to the original source; we do not host files.' },
];

function WhyTothSection() {
  return (
    <section className="border-t border-stone-200 bg-white">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:py-12">
        <h2 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
          Why Toth?
        </h2>
        <p className="mt-2 text-stone-600">
          A single place to discover and access free, openly licensed books.
        </p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {WHY_TOTH_ITEMS.map(({ title, description }) => (
            <div
              key={title}
              className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover"
            >
              <h3 className="text-base font-semibold text-stone-900">{title}</h3>
              <p className="mt-2 text-sm text-stone-600">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const [data, setData] = useState<{
    popular: WorkSummary[];
    recent: WorkSummary[];
    bySubject: Array<{ subject: string; works: WorkSummary[] }>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getHome()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main>
      <section className="border-b border-stone-200 bg-white/80">
        <div className="mx-auto max-w-4xl px-4 py-14 text-center sm:py-20">
          <div className="flex justify-center">
            <img
              src="/toth-logo-original.png"
              alt="Toth"
              width={320}
              height={107}
              className="h-20 w-auto object-contain sm:h-28 md:h-32"
            />
          </div>
          <h1 className="mt-6 text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl md:text-5xl">
            Free EPUBs from trusted sources
          </h1>
          <p className="mt-5 max-w-2xl mx-auto text-lg text-stone-600">
            Search and browse public available books. Public domain and open
            licenses from Project Gutenberg, Standard Ebooks, Open Library and more.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
            <Link
              href="/search"
              className="btn-primary inline-flex rounded-xl px-8 py-3.5 text-base font-medium shadow-card transition-all hover:shadow-card-hover focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
            >
              Search books
            </Link>
            {!user && (
              <>
                <Link
                  href="/login"
                  className="inline-flex rounded-xl border border-stone-200 bg-white px-6 py-3.5 text-base font-medium text-stone-700 shadow-card transition-all hover:border-stone-300 hover:shadow-card-hover focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="inline-flex rounded-xl border border-stone-200 bg-white px-6 py-3.5 text-base font-medium text-stone-700 shadow-card transition-all hover:border-stone-300 hover:shadow-card-hover focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <WhyTothSection />

      {error && (
        <div className="mx-auto max-w-5xl px-4 py-6">
          <div className="rounded-xl bg-red-50 px-4 py-3 text-red-800">
            {error}
          </div>
        </div>
      )}

      <Section
        title="Popular"
        subtitle="Most read this week"
        works={data?.popular ?? []}
        loading={loading}
      />
      <Section
        title="Recently added"
        subtitle="Latest arrivals"
        works={data?.recent ?? []}
        loading={loading}
      />

      {data?.bySubject && data.bySubject.length > 0 && (
        <section className="border-t border-stone-200 bg-gradient-to-b from-stone-50/90 to-white">
          <div className="mx-auto max-w-5xl px-4 py-10 sm:py-12">
            <div className="mb-8">
              <h2 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
                Browse by topic
              </h2>
              <p className="mt-2 text-stone-600">
                Explore by subject — fiction, history, science and more.
              </p>
              <p className="mt-2">
                <Link href="/search" className="text-sm font-medium text-primary-600 hover:text-primary-700 focus:outline-none focus:underline">
                  See all subjects in search
                </Link>
              </p>
            </div>
            <div className="space-y-6">
              {data.bySubject.map(({ subject, works }, i) => (
                <SubjectSection
                  key={subject}
                  subject={subject}
                  works={works}
                  accentIndex={i}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="border-t border-stone-200 bg-stone-50/50">
        <div className="mx-auto max-w-3xl px-4 py-12">
          <h2 className="text-center text-lg font-semibold text-stone-800">
            How it works
          </h2>
          <ol className="mt-8 grid gap-8 sm:grid-cols-3">
            <li className="text-center">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-stone-200 text-sm font-semibold text-stone-700">
                1
              </span>
              <p className="mt-3 text-stone-600">
                Search by title or author, or browse by topic and subject.
              </p>
            </li>
            <li className="text-center">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-stone-200 text-sm font-semibold text-stone-700">
                2
              </span>
              <p className="mt-3 text-stone-600">
                Filter by language or license. Rate and save works for later.
              </p>
            </li>
            <li className="text-center">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-stone-200 text-sm font-semibold text-stone-700">
                3
              </span>
              <p className="mt-3 text-stone-600">
                Open a work and download EPUBs from the original source.
              </p>
            </li>
          </ol>
          <p className="mt-8 text-center text-sm text-stone-500">
            All from public and openly licensed catalogs.
          </p>
        </div>
      </section>
    </main>
  );
}
