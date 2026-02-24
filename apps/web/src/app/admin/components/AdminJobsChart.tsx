'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import type { AdminStatsJobsTimeSeriesPoint } from '@/lib/api';

interface AdminJobsChartProps {
  data: AdminStatsJobsTimeSeriesPoint[];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year:
      d.getFullYear() !== new Date().getFullYear()
        ? '2-digit'
        : undefined,
  });
}

function formatYAxis(value: number): string {
  if (value >= 1000) {
    const k = value / 1000;
    return k % 1 === 0 ? `${k}k` : `${k.toFixed(1)}k`;
  }
  return String(value);
}

const JOBS_TOOLTIP_SERIES = [
  { dataKey: 'created', name: 'Created', color: '#64748b' },
  { dataKey: 'completed', name: 'Completed', color: '#10b981' },
  { dataKey: 'failed', name: 'Failed', color: '#f43f5e' },
] as const;

function JobsChartTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length || !payload[0].payload?.date) return null;
  const dateLabel = formatDate(payload[0].payload.date);
  return (
    <div
      className="rounded-xl border border-stone-200 bg-white px-3.5 py-3 shadow-[0_4px_12px_rgba(0,0,0,0.12)]"
      role="presentation"
    >
      <p className="mb-2 text-sm font-semibold text-stone-800">{dateLabel}</p>
      <ul className="space-y-1 text-xs text-stone-600">
        {JOBS_TOOLTIP_SERIES.map((s) => {
          const raw = payload[0].payload?.[s.dataKey];
          const value = typeof raw === 'number' ? raw : 0;
          return (
            <li key={s.dataKey} className="flex items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-sm"
                style={{ backgroundColor: s.color }}
              />
              <span>{s.name}: {value}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function AdminJobsChart({ data }: AdminJobsChartProps) {
  const chartData = data.map((p) => ({
    ...p,
    label: formatDate(p.date),
  }));

  const isEmpty = chartData.length === 0;

  return (
    <div className="admin-card overflow-hidden p-5">
      <h3 className="text-base font-semibold text-stone-800">
        Ingestion jobs over time
      </h3>
      <p className="mt-0.5 text-xs text-stone-500">
        Created, completed, and failed per period
      </p>
      <div
        className="mt-4 h-72"
        role="img"
        aria-label="Chart: Ingestion jobs over time"
      >
        {isEmpty ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-stone-200 bg-stone-50/50 text-sm text-stone-500">
            No data for the selected period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="jobs-barCreated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#94a3b8" stopOpacity={1} />
                  <stop offset="100%" stopColor="#64748b" stopOpacity={0.9} />
                </linearGradient>
                <linearGradient id="jobs-barCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={1} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.9} />
                </linearGradient>
                <linearGradient id="jobs-barFailed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fb7185" stopOpacity={1} />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.9} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e2e8f0"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                interval="preserveStartEnd"
              />
              <YAxis
                width={36}
                domain={[0, 'auto']}
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickFormatter={formatYAxis}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<JobsChartTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '12px' }}
                formatter={(value) => value}
                iconType="square"
                iconSize={10}
              />
              <Bar
                dataKey="created"
                name="Created"
                fill="url(#jobs-barCreated)"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="completed"
                name="Completed"
                fill="url(#jobs-barCompleted)"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="failed"
                name="Failed"
                fill="url(#jobs-barFailed)"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
