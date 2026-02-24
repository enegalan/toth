type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  const baseClassName =
    'relative overflow-hidden rounded bg-gradient-to-r from-stone-200 via-stone-100 to-stone-200 motion-safe:animate-skeleton';

  return (
    <div
      className={className ? baseClassName + ' ' + className : baseClassName}
      style={{ backgroundSize: '200% 100%' }}
      aria-hidden
    />
  );
}

