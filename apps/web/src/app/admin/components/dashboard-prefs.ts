import type { AdminStatsGroupBy } from '@/lib/api';

export const DASHBOARD_PREFS_KEY = 'toth-admin-dashboard-prefs';

export const WIDGET_IDS = [
  'kpis',
  'jobsChart',
  'catalogChart',
  'connectorDurationChart',
] as const;

export type WidgetId = (typeof WIDGET_IDS)[number];

export const DEFAULT_VISIBLE_WIDGETS: WidgetId[] = [
  'kpis',
  'jobsChart',
  'catalogChart',
  'connectorDurationChart',
];

export type DateRangePreset = '7' | '30' | '90' | 'custom';

export interface DashboardPrefs {
  visibleWidgets: WidgetId[];
  dateRange: DateRangePreset;
  groupBy: AdminStatsGroupBy;
  sourceId: string | null;
  customFrom: string | null;
  customTo: string | null;
}

export const DEFAULT_PREFS: DashboardPrefs = {
  visibleWidgets: DEFAULT_VISIBLE_WIDGETS,
  dateRange: '30',
  groupBy: 'day',
  sourceId: null,
  customFrom: null,
  customTo: null,
};

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function loadDashboardPrefs(): DashboardPrefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(DASHBOARD_PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<DashboardPrefs>;
    const visibleWidgets = Array.isArray(parsed.visibleWidgets)
      ? parsed.visibleWidgets.filter((id): id is WidgetId =>
          WIDGET_IDS.includes(id as WidgetId),
        )
      : DEFAULT_VISIBLE_WIDGETS;
    if (visibleWidgets.length === 0) {
      visibleWidgets.push(...DEFAULT_VISIBLE_WIDGETS);
    }
    return {
      visibleWidgets,
      dateRange:
        parsed.dateRange === '7' ||
        parsed.dateRange === '30' ||
        parsed.dateRange === '90' ||
        parsed.dateRange === 'custom'
          ? parsed.dateRange
          : DEFAULT_PREFS.dateRange,
      groupBy:
        parsed.groupBy === 'day' || parsed.groupBy === 'week' || parsed.groupBy === 'month'
          ? parsed.groupBy
          : DEFAULT_PREFS.groupBy,
      sourceId:
        typeof parsed.sourceId === 'string' && parsed.sourceId
          ? parsed.sourceId
          : null,
      customFrom:
        typeof parsed.customFrom === 'string' ? parsed.customFrom : null,
      customTo: typeof parsed.customTo === 'string' ? parsed.customTo : null,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function saveDashboardPrefs(prefs: DashboardPrefs): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DASHBOARD_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

export function prefsToStatsParams(prefs: DashboardPrefs): {
  from: string;
  to: string;
  groupBy: AdminStatsGroupBy;
  sourceId: string | undefined;
} {
  const now = new Date();
  let from: Date;
  let to: Date = new Date(now);
  if (prefs.dateRange === 'custom' && prefs.customFrom && prefs.customTo) {
    from = new Date(prefs.customFrom);
    to = new Date(prefs.customTo);
    if (isNaN(from.getTime())) from = offsetDays(now, -30);
    if (isNaN(to.getTime())) to = now;
    if (from > to) from = new Date(to.getTime());
  } else {
    const days =
      prefs.dateRange === '7' ? 7 : prefs.dateRange === '90' ? 90 : 30;
    to = now;
    from = offsetDays(now, -days);
  }
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    groupBy: prefs.groupBy,
    sourceId: prefs.sourceId ?? undefined,
  };
}

function offsetDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function getDefaultCustomDates(): { from: string; to: string } {
  const to = new Date();
  const from = offsetDays(to, -30);
  return { from: toISODate(from), to: toISODate(to) };
}
