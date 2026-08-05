'use client';

interface SkeletonProps {
  className?: string;
}

/** Single skeleton block — animated on motion-safe devices. */
export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={['rounded bg-slate-200 motion-safe:animate-pulse', className].join(' ')}
      aria-hidden="true"
    />
  );
}

/** Skeleton for a journal card row. */
export function JournalCardSkeleton() {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: 'var(--wt-card)', borderColor: 'var(--wt-border)' }}
      aria-hidden="true"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="mt-3 flex gap-2">
        <Skeleton className="h-4 w-12 rounded-full" />
        <Skeleton className="h-4 w-16 rounded-full" />
      </div>
    </div>
  );
}

/** Skeleton for a goal card row. */
export function GoalCardSkeleton() {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: 'var(--wt-card)', borderColor: 'var(--wt-border)' }}
      aria-hidden="true"
    >
      <div className="space-y-2">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-3 w-full rounded-full" />
        <div className="flex gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  );
}

interface LoadingSkeletonProps {
  variant?: 'journal' | 'goal';
  count?: number;
}

export function LoadingSkeleton({ variant = 'journal', count = 4 }: LoadingSkeletonProps) {
  const Card = variant === 'goal' ? GoalCardSkeleton : JournalCardSkeleton;
  return (
    <div className="space-y-3" role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} />
      ))}
    </div>
  );
}
