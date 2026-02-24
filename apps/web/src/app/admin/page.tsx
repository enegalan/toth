'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import {
  triggerIngestion,
  getIngestionJobs,
  getAdminSources,
  cancelIngestionJob,
  deleteIngestionJob,
  clearSearchIndex,
  triggerIngestionForSource,
  setSourceEnabled,
  getAdminStats,
  type AdminStatsResponse,
} from '@/lib/api';
import {
  loadDashboardPrefs,
  saveDashboardPrefs,
  prefsToStatsParams,
  DEFAULT_PREFS,
  type DashboardPrefs,
} from './components/dashboard-prefs';
import { AdminDashboardControls } from './components/AdminDashboardControls';
import { AdminDashboardConfig } from './components/AdminDashboardConfig';
import { AdminStatCard } from './components/AdminStatCard';
import { AdminJobsChart } from './components/AdminJobsChart';
import { AdminCatalogChart } from './components/AdminCatalogChart';
import {
  AdminConnectorDurationChart,
  formatDuration,
} from './components/AdminConnectorDurationChart';
import { AdminStatsSkeleton } from './components/AdminStatsSkeleton';

export default function AdminPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [sources, setSources] = useState<
    Array<{
      id: string;
      name: string;
      connector_type: string | null;
      base_url: string;
      enabled: boolean;
    }>
  >([]);
  const [jobs, setJobs] = useState<
    Array<{
      id: string;
      source_name: string;
      connector_type: string | null;
      status: string;
      started_at: string | null;
      completed_at: string | null;
      duration_seconds: number | null;
      error_message: string | null;
      created_at: string;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [clearingIndex, setClearingIndex] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [triggeringSourceId, setTriggeringSourceId] = useState<string | null>(null);
  const [togglingSourceId, setTogglingSourceId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [dashboardPrefs, setDashboardPrefs] = useState<DashboardPrefs>(() =>
    typeof window !== 'undefined' ? loadDashboardPrefs() : DEFAULT_PREFS,
  );
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [statsUpdatedAt, setStatsUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    setDashboardPrefs(loadDashboardPrefs());
  }, []);

  useEffect(() => {
    saveDashboardPrefs(dashboardPrefs);
  }, [dashboardPrefs]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'admin') {
      router.replace('/');
    }
  }, [authLoading, user, router]);

  const loadStats = useCallback(
    async (silent = false) => {
      if (!silent) {
        setStatsLoading(true);
        setStatsError(null);
      }
      try {
        const params = prefsToStatsParams(dashboardPrefs);
        const data = await getAdminStats(params);
        setStats(data);
        setStatsUpdatedAt(new Date());
        if (silent) setStatsError(null);
      } catch (e) {
        setStatsError(e instanceof Error ? e.message : 'Failed to load stats');
      } finally {
        if (!silent) setStatsLoading(false);
      }
    },
    [dashboardPrefs],
  );

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    const interval = setInterval(() => loadStats(true), 15000);
    return () => clearInterval(interval);
  }, [loadStats]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sourcesRes, jobsRes] = await Promise.all([
        getAdminSources(),
        getIngestionJobs(),
      ]);
      setSources(sourcesRes.sources);
      setJobs(jobsRes.jobs);
    } catch (e) {
      setMessage({
        type: 'err',
        text: e instanceof Error ? e.message : 'Failed to load',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  async function handleTrigger() {
    setTriggering(true);
    setMessage(null);
    try {
      const res = await triggerIngestion();
      setMessage({ type: 'ok', text: res.message });
      await load();
    } catch (e) {
      setMessage({
        type: 'err',
        text: e instanceof Error ? e.message : 'Failed to trigger',
      });
    } finally {
      setTriggering(false);
    }
  }

  async function handleCancel(jobId: string) {
    setCancellingId(jobId);
    setMessage(null);
    try {
      const res = await cancelIngestionJob(jobId);
      setMessage({ type: 'ok', text: res.message });
      await load();
    } catch (e) {
      setMessage({
        type: 'err',
        text: e instanceof Error ? e.message : 'Failed to cancel',
      });
    } finally {
      setCancellingId(null);
    }
  }

  async function handleDelete(jobId: string) {
    if (!window.confirm('Delete this job and its events?')) return;
    setDeletingId(jobId);
    setMessage(null);
    try {
      const res = await deleteIngestionJob(jobId);
      setMessage({ type: 'ok', text: res.message });
      await load();
    } catch (e) {
      setMessage({
        type: 'err',
        text: e instanceof Error ? e.message : 'Failed to delete job',
      });
    } finally {
      setDeletingId(null);
    }
  }

  async function handleClearIndex() {
    if (!window.confirm('Clear the entire search index? All indexed works will be removed. You can re-index by running full ingestion.')) return;
    setClearingIndex(true);
    setMessage(null);
    try {
      const res = await clearSearchIndex();
      setMessage({ type: 'ok', text: res.message });
    } catch (e) {
      setMessage({
        type: 'err',
        text: e instanceof Error ? e.message : 'Failed to clear index',
      });
    } finally {
      setClearingIndex(false);
    }
  }

  const connectorSources = sources.filter((s) => s.connector_type);
  const enabledConnectorSources = connectorSources.filter((s) => s.enabled);

  async function handleTriggerSource(sourceId: string) {
    setTriggeringSourceId(sourceId);
    setMessage(null);
    try {
      const res = await triggerIngestionForSource(sourceId);
      setMessage({ type: 'ok', text: res.message });
      await load();
    } catch (e) {
      setMessage({
        type: 'err',
        text: e instanceof Error ? e.message : 'Failed to trigger',
      });
    } finally {
      setTriggeringSourceId(null);
    }
  }

  async function handleToggleEnabled(source: (typeof sources)[0]) {
    setTogglingSourceId(source.id);
    setMessage(null);
    try {
      await setSourceEnabled(source.id, !source.enabled);
      setSources((prev) =>
        prev.map((s) =>
          s.id === source.id ? { ...s, enabled: !s.enabled } : s,
        ),
      );
      setMessage({
        type: 'ok',
        text: source.enabled ? 'Source disabled.' : 'Source enabled.',
      });
    } catch (e) {
      setMessage({
        type: 'err',
        text: e instanceof Error ? e.message : 'Failed to update source',
      });
    } finally {
      setTogglingSourceId(null);
    }
  }

  if (authLoading || !user || user.role !== 'admin') {
    return null;
  }

  return (
    <main>
      <div className="mx-auto max-w-5xl px-4 py-8">
        <section className="animate-fade-in">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-stone-900">
                Dashboard
              </h1>
              <p className="mt-1 text-sm text-stone-500">
                Statistics and charts. Adjust date range, grouping, and source below.
                {statsUpdatedAt && (
                  <span className="ml-1.5 text-stone-400">
                    · Auto-refreshes every 15s · Last update{' '}
                    {statsUpdatedAt.toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="mb-4">
            <AdminDashboardConfig
              prefs={dashboardPrefs}
              onPrefsChange={setDashboardPrefs}
            />
          </div>
          <div className="mb-6">
            <AdminDashboardControls
              prefs={dashboardPrefs}
              sources={sources.map((s) => ({ id: s.id, name: s.name }))}
              onPrefsChange={setDashboardPrefs}
            />
          </div>
          {statsError && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-800 shadow-card">
              {statsError}
            </div>
          )}
          {statsLoading && !stats ? (
            <div className="mb-6">
              <AdminStatsSkeleton />
            </div>
          ) : stats ? (
            <div className="space-y-6">
              {dashboardPrefs.visibleWidgets.includes('kpis') && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                  <AdminStatCard
                    title="Works"
                    value={stats.summary.worksCount}
                    accent="blue"
                  />
                  <AdminStatCard
                    title="Authors"
                    value={stats.summary.authorsCount}
                    accent="violet"
                  />
                  <AdminStatCard
                    title="Editions"
                    value={stats.summary.editionsCount}
                    accent="emerald"
                  />
                  <AdminStatCard
                    title="Sources"
                    value={stats.summary.sourcesCount}
                    accent="amber"
                  />
                  <AdminStatCard
                    title="Pending / Running"
                    value={`${stats.summary.jobsByStatus.pending} / ${stats.summary.jobsByStatus.running}`}
                    accent="sky"
                  />
                  <AdminStatCard
                    title="Completed / Failed"
                    value={`${stats.summary.jobsByStatus.completed} / ${stats.summary.jobsByStatus.failed}`}
                    accent="rose"
                  />
                </div>
              )}
              {dashboardPrefs.visibleWidgets.includes('jobsChart') && (
                <AdminJobsChart data={stats.jobsTimeSeries} />
              )}
              {dashboardPrefs.visibleWidgets.includes('catalogChart') && (
                <AdminCatalogChart data={stats.catalogTimeSeries} />
              )}
              {dashboardPrefs.visibleWidgets.includes('connectorDurationChart') &&
                stats.connectorDurations && (
                  <AdminConnectorDurationChart
                    data={stats.connectorDurations}
                  />
                )}
            </div>
          ) : null}
        </section>

        <h1 className="mt-14 text-2xl font-bold tracking-tight text-stone-900">
          Build search index
        </h1>
        <p className="mt-1 text-stone-500">
          Trigger a full ingestion from all configured sources. The worker picks up jobs every 2 minutes and indexes EPUBs into search.
        </p>

        {message && (
          <div
            className={`mt-4 rounded-2xl border px-4 py-3 shadow-card ${
              message.type === 'ok'
                ? 'border-emerald-200/80 bg-emerald-50/80 text-emerald-800'
                : 'border-red-200/80 bg-red-50/80 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleTrigger}
            disabled={triggering || enabledConnectorSources.length === 0}
            className="btn-primary rounded-xl px-4 py-2.5 text-sm font-medium shadow-card transition-all hover:shadow-card-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {triggering ? 'Triggering…' : 'Run full ingestion now'}
          </button>
          <button
            type="button"
            onClick={handleClearIndex}
            disabled={clearingIndex}
            className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {clearingIndex ? 'Clearing…' : 'Clear search index'}
          </button>
          {enabledConnectorSources.length === 0 && (
            <span className="text-sm text-stone-500">
              {connectorSources.length === 0
                ? 'No sources with a connector. Run migrations so default sources exist.'
                : 'No enabled sources with a connector. Enable at least one to run full ingestion.'}
            </span>
          )}
        </div>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-stone-800">Sources</h2>
          {loading && sources.length === 0 ? (
            <p className="mt-2 text-stone-500">Loading…</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {sources.map((s) => (
                <li
                  key={s.id}
                  className={`admin-card flex flex-wrap items-center gap-3 px-4 py-3 ${
                    s.enabled ? '' : 'opacity-75'
                  }`}
                >
                  <span
                    className={`font-medium ${s.enabled ? 'text-stone-900' : 'text-stone-500'}`}
                  >
                    {s.name}
                  </span>
                  {s.connector_type ? (
                    <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      {s.connector_type}
                    </span>
                  ) : (
                    <span className="rounded-lg bg-stone-100 px-2 py-0.5 text-xs text-stone-500">
                      no connector
                    </span>
                  )}
                  {!s.enabled && (
                    <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      disabled
                    </span>
                  )}
                  <a
                    href={s.base_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="max-w-xs truncate text-sm text-stone-500 hover:text-stone-700"
                  >
                    {s.base_url}
                  </a>
                  <div className="ml-auto flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleEnabled(s)}
                      disabled={togglingSourceId === s.id}
                      className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-50"
                    >
                      {togglingSourceId === s.id
                        ? '…'
                        : s.enabled
                          ? 'Disable'
                          : 'Enable'}
                    </button>
                    {s.connector_type && s.enabled && (
                      <button
                        type="button"
                        onClick={() => handleTriggerSource(s.id)}
                        disabled={triggeringSourceId === s.id}
                        className="btn-primary rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        {triggeringSourceId === s.id
                          ? 'Triggering…'
                          : 'Run ingest'}
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-stone-800">Recent ingestion jobs</h2>
          <p className="mt-1 text-sm text-stone-500">Refreshes every 10 seconds.</p>
          {loading && jobs.length === 0 ? (
            <p className="mt-2 text-stone-500">Loading…</p>
          ) : jobs.length === 0 ? (
            <p className="mt-2 text-stone-500">No jobs yet. Click &quot;Run full ingestion now&quot; to start.</p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-2xl border border-stone-200/80 bg-white shadow-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200/80 bg-stone-50/50">
                    <th className="px-4 py-3 text-left font-medium text-stone-600">Source</th>
                    <th className="px-4 py-3 text-left font-medium text-stone-600">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-stone-600">Created</th>
                    <th className="px-4 py-3 text-left font-medium text-stone-600">Completed</th>
                    <th className="px-4 py-3 text-left font-medium text-stone-600">Duration</th>
                    <th className="px-4 py-3 text-left font-medium text-stone-600">Error</th>
                    <th className="px-4 py-3 text-left font-medium text-stone-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j) => (
                    <tr key={j.id} className="border-b border-stone-100 transition-colors hover:bg-stone-50/50">
                      <td className="px-4 py-3 text-stone-900">
                        <Link
                          href={`/admin/ingestion/jobs/${j.id}`}
                          className="font-medium text-stone-900 hover:underline"
                        >
                          {j.source_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-lg px-2 py-0.5 text-xs font-medium ${
                            j.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-700'
                              : j.status === 'running'
                                ? 'bg-amber-100 text-amber-700'
                                : j.status === 'failed'
                                  ? 'bg-red-100 text-red-700'
                                  : j.status === 'cancelled'
                                    ? 'bg-stone-200 text-stone-600'
                                    : 'bg-sky-100 text-sky-700'
                          }`}
                        >
                          {j.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-stone-600">
                        {new Date(j.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-stone-600">
                        {j.completed_at
                          ? new Date(j.completed_at).toLocaleString()
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-stone-600">
                        {j.duration_seconds != null
                          ? formatDuration(j.duration_seconds)
                          : '—'}
                      </td>
                      <td className="max-w-xs truncate px-4 py-3 text-red-600" title={j.error_message ?? ''}>
                        {j.error_message ?? '—'}
                      </td>
                      <td className="flex items-center gap-2 px-4 py-3">
                        <Link
                          href={`/admin/ingestion/jobs/${j.id}`}
                          className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50"
                        >
                          View
                        </Link>
                        {j.status === 'pending' || j.status === 'running' ? (
                          <button
                            type="button"
                            onClick={() => handleCancel(j.id)}
                            disabled={cancellingId === j.id}
                            className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-50"
                          >
                            {cancellingId === j.id ? 'Cancelling…' : 'Cancel'}
                          </button>
                        ) : null}
                        {(j.status === 'completed' || j.status === 'failed' || j.status === 'cancelled') ? (
                          <button
                            type="button"
                            onClick={() => handleDelete(j.id)}
                            disabled={deletingId === j.id}
                            className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-50 disabled:opacity-50"
                          >
                            {deletingId === j.id ? 'Deleting…' : 'Delete'}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
