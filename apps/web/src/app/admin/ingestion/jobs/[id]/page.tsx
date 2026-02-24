'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getIngestionJobDetail,
  cancelIngestionJob,
  retryIngestionJob,
} from '@/lib/api';

type JobDetail = {
  id: string;
  source_id: string;
  source_name: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
};

type EventRow = {
  id: string;
  event_type: string;
  message: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
};

function formatRelative(from: string, to: string): string {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  const s = Math.round((b - a) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m < 60) return r ? `${m}m ${r}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `${h}h ${rm}m` : `${h}h`;
}

function eventTypeStyles(eventType: string): string {
  switch (eventType) {
    case 'started':
    case 'completed':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    case 'progress':
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    case 'failed':
    case 'cancelled':
      return 'bg-red-500/20 text-red-300 border-red-500/40';
    default:
      return 'bg-stone-500/20 text-stone-400 border-stone-500/40';
  }
}

export default function IngestionJobDetailPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';
  const [job, setJob] = useState<JobDetail | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const eventsEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getIngestionJobDetail(id);
      setJob(data.job);
      setEvents(data.events);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load job');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!id) return;
    const isLive = job?.status === 'pending' || job?.status === 'running';
    if (!isLive) return;
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [id, job?.status, load]);

  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  async function handleCancel() {
    if (!id) return;
    setCancelling(true);
    try {
      await cancelIngestionJob(id);
      await load();
    } finally {
      setCancelling(false);
    }
  }

  async function handleRetry() {
    if (!id) return;
    setRetrying(true);
    setError(null);
    try {
      const { id: newId } = await retryIngestionJob(id);
      router.push(`/admin/ingestion/jobs/${newId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to retry job');
    } finally {
      setRetrying(false);
    }
  }

  if (!id) {
    return (
      <main className="min-h-[50vh] px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <p className="text-stone-600">Invalid job id.</p>
          <Link
            href="/admin"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-stone-600 hover:text-stone-900"
          >
            ← Back to Admin
          </Link>
        </div>
      </main>
    );
  }

  if (loading && !job) {
    return (
      <main className="min-h-[50vh] px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="h-8 w-48 animate-pulse rounded bg-stone-200" />
          <div className="mt-6 h-32 animate-pulse rounded-2xl bg-stone-100" />
          <div className="mt-6 h-6 w-32 animate-pulse rounded bg-stone-100" />
          <div className="mt-4 h-64 animate-pulse rounded-2xl bg-stone-100" />
        </div>
      </main>
    );
  }

  if (error || !job) {
    return (
      <main className="min-h-[50vh] px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-red-800">
            {error ?? 'Job not found.'}
          </div>
          <Link
            href="/admin"
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-stone-600 hover:text-stone-900"
          >
            ← Back to Admin
          </Link>
        </div>
      </main>
    );
  }

  const isLive = job.status === 'pending' || job.status === 'running';
  const duration =
    job.started_at && job.completed_at
      ? formatRelative(job.started_at, job.completed_at)
      : null;

  const statusConfig: Record<string, { label: string; className: string }> = {
    completed: { label: 'Completed', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    running: {
      label: 'Running',
      className: 'bg-amber-100 text-amber-800 border-amber-200',
    },
    pending: { label: 'Pending', className: 'bg-stone-100 text-stone-700 border-stone-200' },
    failed: { label: 'Failed', className: 'bg-red-100 text-red-800 border-red-200' },
    cancelled: { label: 'Cancelled', className: 'bg-stone-200 text-stone-600 border-stone-300' },
  };
  const statusInfo = statusConfig[job.status] ?? {
    label: job.status,
    className: 'bg-stone-100 text-stone-600 border-stone-200',
  };

  return (
    <main className="min-h-[50vh] bg-stone-50/50">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <nav className="mb-6 flex items-center gap-2 text-sm text-stone-500">
          <Link href="/admin" className="hover:text-stone-700">
            Admin
          </Link>
          <span aria-hidden>/</span>
          <Link href="/admin" className="hover:text-stone-700">
            Ingestion
          </Link>
          <span aria-hidden>/</span>
          <span className="truncate font-medium text-stone-700">{job.id}</span>
        </nav>

        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900">
              {job.source_name}
            </h1>
            <p className="mt-1 font-mono text-sm text-stone-500">{job.id}</p>
          </div>
          <div className="flex items-center gap-4">
            <span
              className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-sm font-medium ${statusInfo.className}`}
            >
              {isLive && (
                <span
                  className="mr-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500 animate-pulse"
                  title="Job in progress"
                  aria-hidden
                />
              )}
              {statusInfo.label}
            </span>
            <span className="h-6 w-px shrink-0 bg-stone-200" aria-hidden />
            {isLive && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {cancelling ? 'Cancelling…' : 'Cancel'}
              </button>
            )}
            {!isLive && (
              <button
                type="button"
                onClick={handleRetry}
                disabled={retrying}
                className="rounded-lg border border-stone-300 bg-stone-100 px-3 py-1.5 text-sm font-medium text-stone-800 hover:bg-stone-200 disabled:opacity-50"
              >
                {retrying ? 'Retrying…' : 'Retry'}
              </button>
            )}
          </div>
        </header>

        <div className="admin-card mb-8 overflow-hidden p-0">
          <dl className="grid grid-cols-1 gap-0 sm:grid-cols-2">
            <div className="border-b border-stone-100 px-5 py-4 sm:border-b-0 sm:border-r sm:py-5">
              <dt className="text-xs font-medium uppercase tracking-wider text-stone-400">
                Created
              </dt>
              <dd className="mt-1 text-sm text-stone-800">
                {new Date(job.created_at).toLocaleString()}
              </dd>
            </div>
            {job.started_at && (
              <div className="border-b border-stone-100 px-5 py-4 sm:border-b-0 sm:border-r sm:py-5">
                <dt className="text-xs font-medium uppercase tracking-wider text-stone-400">
                  Started
                </dt>
                <dd className="mt-1 text-sm text-stone-800">
                  {new Date(job.started_at).toLocaleString()}
                </dd>
              </div>
            )}
            {job.completed_at && (
              <div className="border-b border-stone-100 px-5 py-4 sm:border-b-0 sm:border-r sm:py-5">
                <dt className="text-xs font-medium uppercase tracking-wider text-stone-400">
                  Completed
                </dt>
                <dd className="mt-1 text-sm text-stone-800">
                  {new Date(job.completed_at).toLocaleString()}
                </dd>
              </div>
            )}
            {duration && (
              <div className="border-b border-stone-100 px-5 py-4 sm:border-b-0 sm:border-r sm:py-5">
                <dt className="text-xs font-medium uppercase tracking-wider text-stone-400">
                  Duration
                </dt>
                <dd className="mt-1 text-sm font-medium text-stone-800">{duration}</dd>
              </div>
            )}
          </dl>
        </div>

        {job.error_message && (
          <div
            className="admin-card mb-8 border border-red-200/80 bg-red-50/90 px-4 py-3 sm:px-5 sm:py-4"
            role="alert"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-red-100 p-1.5 text-red-600">
                <svg
                  aria-hidden
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l6.518 11.59C19.02 16.42 18.246 18 16.813 18H3.187c-1.433 0-2.207-1.58-1.448-3.311l6.518-11.59Zm1.743 3.401a.75.75 0 0 0-.75.75v3.75a.75.75 0 0 0 1.5 0V7.25a.75.75 0 0 0-.75-.75Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-800">
                  Error while running ingestion job
                </h3>
                <p className="mt-1 text-sm text-red-700">
                  The worker reported the following error message:
                </p>
                <pre className="mt-3 max-h-40 overflow-auto rounded-md bg-red-900/5 px-3 py-2 font-mono text-xs text-red-800">
                  {job.error_message}
                </pre>
              </div>
            </div>
          </div>
        )}

        <section className="admin-card overflow-hidden p-0">
          <div className="border-b border-stone-200 bg-stone-50/80 px-5 py-3">
            <h2 className="text-base font-semibold text-stone-800">Event log</h2>
            <p className="mt-0.5 text-sm text-stone-500">
              {isLive
                ? 'Refreshing every 2s while the job is running.'
                : 'Chronological events for this ingestion.'}
            </p>
          </div>
          <div className="max-h-[60vh] min-h-[220px] overflow-auto bg-stone-900 font-mono text-sm">
            {events.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-5 py-12 text-stone-500">
                {job.status === 'pending' ? (
                  <>
                    <span className="text-4xl" aria-hidden>⏳</span>
                    <p>Waiting for worker. Events will appear here.</p>
                  </>
                ) : (
                  <p>No events recorded.</p>
                )}
              </div>
            ) : (
              <ul className="divide-y divide-stone-700/80">
                {events.map((e) => {
                  const detailStr =
                    e.message ?? (e.detail ? JSON.stringify(e.detail) : '');
                  return (
                    <li
                      key={e.id}
                      className="flex gap-3 px-4 py-2.5 text-left align-baseline hover:bg-stone-800/50"
                    >
                      <span
                        className="shrink-0 pt-0.5 text-stone-500 tabular-nums"
                        title={new Date(e.created_at).toISOString()}
                      >
                        {new Date(e.created_at).toISOString().replace('T', ' ').slice(0, 23)}
                      </span>
                      <span
                        className={`shrink-0 self-center rounded border px-1.5 py-0.5 text-xs font-medium ${eventTypeStyles(e.event_type)}`}
                      >
                        {e.event_type}
                      </span>
                      {detailStr ? (
                        <span className="min-w-0 flex-1 break-words text-stone-200">
                          {detailStr}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
                <div ref={eventsEndRef} aria-hidden />
              </ul>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
