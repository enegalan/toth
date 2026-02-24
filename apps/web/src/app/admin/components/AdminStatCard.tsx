'use client';

const ACCENT_BORDER: Record<string, string> = {
  blue: 'border-l-blue-500',
  violet: 'border-l-violet-500',
  emerald: 'border-l-emerald-500',
  amber: 'border-l-amber-500',
  sky: 'border-l-sky-500',
  rose: 'border-l-rose-500',
  primary: 'border-l-primary-500',
  brand: 'border-l-brand-500',
};

interface AdminStatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  accent?: keyof typeof ACCENT_BORDER;
}

export function AdminStatCard({
  title,
  value,
  subtitle,
  accent,
}: AdminStatCardProps) {
  const borderClass = accent ? ACCENT_BORDER[accent] ?? '' : '';

  return (
    <div
      className={`admin-card border-l-4 p-5 transition-all duration-200 ${borderClass}`}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
        {title}
      </p>
      <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-stone-900">
        {value}
      </p>
      {subtitle !== undefined && subtitle !== '' && (
        <p className="mt-1 text-sm text-stone-500">{subtitle}</p>
      )}
    </div>
  );
}
