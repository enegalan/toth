'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import type { AdminStatsConnectorDurationPoint } from '@/lib/api';

interface AdminConnectorDurationChartProps {
  data: AdminStatsConnectorDurationPoint[];
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins < 60) {
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  if (remainMins === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainMins}m`;
}

function formatYAxis(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = seconds / 60;
  if (mins < 60) return `${Math.round(mins)}m`;
  return `${(mins / 60).toFixed(1)}h`;
}

interface ChartPoint {
  connectorType: string;
  avgDurationSeconds: number;
  jobCount: number;
  label: string;
}

function ConnectorDurationTooltip({
  active,
  payload,
}: TooltipProps<number, string>) {
  if (!active || !payload?.length || !payload[0].payload) return null;
  const p = payload[0].payload as ChartPoint;
  return (
    <div
      className="rounded-xl border border-stone-200 bg-white px-3.5 py-3 shadow-[0_4px_12px_rgba(0,0,0,0.12)]"
      role="presentation"
    >
      <p className="mb-2 text-sm font-semibold text-stone-800">
        {p.connectorType}
      </p>
      <ul className="space-y-1 text-xs text-stone-600">
        <li>Avg duration: {formatDuration(p.avgDurationSeconds)}</li>
        <li>Jobs: {p.jobCount}</li>
      </ul>
    </div>
  );
}

export function AdminConnectorDurationChart({ data }: AdminConnectorDurationChartProps) {
  const chartData: ChartPoint[] = data.map((p) => ({
    ...p,
    label: p.connectorType,
  }));

  const isEmpty = chartData.length === 0;

  return (
    <div className="admin-card overflow-hidden p-5">
      <h3 className="text-base font-semibold text-stone-800">
        Average job duration by connector
      </h3>
      <p className="mt-0.5 text-xs text-stone-500">
        Mean duration of completed ingestion jobs per connector type
      </p>
      <div
        className="mt-4 h-72"
        role="img"
        aria-label="Chart: Average job duration by connector"
      >
        {isEmpty ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-stone-200 bg-stone-50/50 text-sm text-stone-500">
            No completed jobs with duration for the selected period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="connectorDuration-bar"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity={1} />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.9} />
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
                interval={0}
              />
              <YAxis
                width={48}
                domain={[0, 'auto']}
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickFormatter={formatYAxis}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<ConnectorDurationTooltip />} />
              <Bar
                dataKey="avgDurationSeconds"
                name="Avg duration"
                fill="url(#connectorDuration-bar)"
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
