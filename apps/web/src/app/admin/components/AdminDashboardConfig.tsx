'use client';

import { useState } from 'react';
import type { DashboardPrefs, WidgetId } from './dashboard-prefs';
import { WIDGET_IDS } from './dashboard-prefs';

const WIDGET_LABELS: Record<WidgetId, string> = {
  kpis: 'Summary cards',
  jobsChart: 'Jobs over time',
  catalogChart: 'Catalog growth',
  connectorDurationChart: 'Avg duration by connector',
};

interface AdminDashboardConfigProps {
  prefs: DashboardPrefs;
  onPrefsChange: (prefs: DashboardPrefs) => void;
}

export function AdminDashboardConfig({
  prefs,
  onPrefsChange,
}: AdminDashboardConfigProps) {
  const [open, setOpen] = useState(false);

  function toggleWidget(id: WidgetId) {
    const visible = prefs.visibleWidgets.includes(id)
      ? prefs.visibleWidgets.filter((w) => w !== id)
      : [...prefs.visibleWidgets, id];
    if (visible.length === 0) return;
    onPrefsChange({ ...prefs, visibleWidgets: visible });
  }

  return (
    <div className="rounded-2xl border border-stone-200/80 bg-stone-50/50 p-3 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100/80"
      >
        <span>Configure dashboard — show widgets</span>
        <span
          className={`text-stone-400 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m19.5 8.25-7.5 7.5-7.5-7.5"
            />
          </svg>
        </span>
      </button>
      {open && (
        <div className="mt-3 flex flex-wrap gap-3 border-t border-stone-200/80 pt-3">
          {WIDGET_IDS.map((id) => (
            <label
              key={id}
              className="flex cursor-pointer items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm text-stone-700 shadow-sm transition-colors hover:bg-stone-50"
            >
              <input
                type="checkbox"
                checked={prefs.visibleWidgets.includes(id)}
                onChange={() => toggleWidget(id)}
                className="h-4 w-4 rounded border-stone-300 text-stone-700 focus:ring-primary-400"
              />
              {WIDGET_LABELS[id]}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
