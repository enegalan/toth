'use client';

import type { AdminStatsGroupBy } from '@/lib/api';
import type { DashboardPrefs, DateRangePreset } from './dashboard-prefs';
import { getDefaultCustomDates } from './dashboard-prefs';

interface AdminDashboardControlsProps {
  prefs: DashboardPrefs;
  sources: Array<{ id: string; name: string }>;
  onPrefsChange: (prefs: DashboardPrefs) => void;
}

const DATE_OPTIONS: { value: DateRangePreset; label: string }[] = [
  { value: '7', label: '7d' },
  { value: '30', label: '30d' },
  { value: '90', label: '90d' },
  { value: 'custom', label: 'Custom' },
];

const GROUP_OPTIONS: { value: AdminStatsGroupBy; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

export function AdminDashboardControls({
  prefs,
  sources,
  onPrefsChange,
}: AdminDashboardControlsProps) {
  function setPrefs(partial: Partial<DashboardPrefs>) {
    onPrefsChange({ ...prefs, ...partial });
  }

  const customDates = getDefaultCustomDates();

  return (
    <div className="admin-card flex flex-wrap items-end gap-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-stone-500">Range</span>
        <div className="flex rounded-xl bg-stone-100/80 p-1">
          {DATE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() =>
                setPrefs({
                  dateRange: opt.value,
                  ...(opt.value === 'custom' && {
                    customFrom: prefs.customFrom ?? customDates.from,
                    customTo: prefs.customTo ?? customDates.to,
                  }),
                })
              }
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                prefs.dateRange === opt.value
                  ? 'bg-white text-stone-800 shadow-sm'
                  : 'text-stone-600 hover:text-stone-800'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      {prefs.dateRange === 'custom' && (
        <>
          <div>
            <label className="sr-only">From</label>
            <input
              type="date"
              value={prefs.customFrom ?? customDates.from}
              onChange={(e) => setPrefs({ customFrom: e.target.value })}
              className="admin-input"
            />
          </div>
          <div>
            <label className="sr-only">To</label>
            <input
              type="date"
              value={prefs.customTo ?? customDates.to}
              onChange={(e) => setPrefs({ customTo: e.target.value })}
              className="admin-input"
            />
          </div>
        </>
      )}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-stone-500">Group by</span>
        <select
          value={prefs.groupBy}
          onChange={(e) =>
            setPrefs({ groupBy: e.target.value as AdminStatsGroupBy })
          }
          className="admin-input w-auto"
        >
          {GROUP_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-stone-500">Source</span>
        <select
          value={prefs.sourceId ?? ''}
          onChange={(e) =>
            setPrefs({ sourceId: e.target.value ? e.target.value : null })
          }
          className="admin-input w-auto min-w-[140px]"
        >
          <option value="">All sources</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
