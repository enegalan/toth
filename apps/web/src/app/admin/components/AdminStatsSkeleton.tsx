'use client';

export function AdminStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="admin-card p-5 animate-fade-in"
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <div className="h-3 w-16 rounded-md bg-stone-200 animate-shimmer" />
          <div className="mt-3 h-8 w-12 rounded-lg bg-stone-100 animate-shimmer" />
        </div>
      ))}
    </div>
  );
}
