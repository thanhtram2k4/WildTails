'use client';

import { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/loading-skeleton';
import { apiGet, isOfflineError, isUnauthorizedError } from '@/lib/api-helpers';
import type { ReportResponse, ReportStatus } from '@wildtails/contracts';

const STATUS_OPTIONS: { value: ReportStatus | ''; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'REVIEWED', label: 'Reviewed' },
  { value: 'DISMISSED', label: 'Dismissed' },
  { value: 'ACTIONED', label: 'Actioned' },
];

const STATUS_BADGE_STYLES: Record<ReportStatus, { bg: string; text: string }> = {
  PENDING: { bg: '#fef9c3', text: '#92400e' },
  REVIEWED: { bg: '#dbeafe', text: '#1e40af' },
  DISMISSED: { bg: '#f1f5f9', text: '#64748b' },
  ACTIONED: { bg: '#dcfce7', text: '#166534' },
};

type ReportsState =
  | { status: 'loading' }
  | { status: 'success'; reports: ReportResponse[]; cursor: string | null; hasMore: boolean }
  | { status: 'error'; message: string; offline: boolean; unauthorized: boolean };

function ReportRowSkeleton() {
  return (
    <tr aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}

export default function ModerationQueuePage({ params }: { params: Promise<{ planetId: string }> }) {
  const { planetId } = use(params);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | ''>('PENDING');
  const [reportsState, setReportsState] = useState<ReportsState>({ status: 'loading' });
  const stateRef = useRef(setReportsState);
  const [loadingMore, setLoadingMore] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    stateRef.current({ status: 'loading' });

    const params = new URLSearchParams({ limit: '20' });
    if (statusFilter) params.set('status', statusFilter);

    apiGet<ReportResponse[]>(`/planets/${planetId}/reports?${params.toString()}`).then(
      (env) => {
        if (cancelled) return;
        stateRef.current({
          status: 'success',
          reports: Array.isArray(env.data) ? env.data : [],
          cursor: env.meta?.cursor ?? null,
          hasMore: env.meta?.hasMore ?? false,
        });
      },
      (err: unknown) => {
        if (cancelled) return;
        stateRef.current({
          status: 'error',
          message: err instanceof Error ? err.message : 'Could not load reports.',
          offline: isOfflineError(err),
          unauthorized: isUnauthorizedError(err),
        });
      },
    );

    return () => {
      cancelled = true;
    };
  }, [planetId, statusFilter, retry]);

  async function handleLoadMore() {
    if (reportsState.status !== 'success' || !reportsState.cursor || loadingMore) return;
    const cursor = reportsState.cursor;
    setLoadingMore(true);
    try {
      const qp = new URLSearchParams({ limit: '20', cursor });
      if (statusFilter) qp.set('status', statusFilter);
      const env = await apiGet<ReportResponse[]>(`/planets/${planetId}/reports?${qp.toString()}`);
      setReportsState((prev) => {
        if (prev.status !== 'success') return prev;
        return {
          ...prev,
          reports: [...prev.reports, ...(Array.isArray(env.data) ? env.data : [])],
          cursor: env.meta?.cursor ?? null,
          hasMore: env.meta?.hasMore ?? false,
        };
      });
    } catch {
      // Silently fail
    } finally {
      setLoadingMore(false);
    }
  }

  const selectClass = [
    'rounded-lg border px-3 py-1.5 text-sm',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488]',
  ].join(' ');

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--wt-navy)' }}>
            Moderation queue
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--wt-text-muted)' }}>
            Review and action reports for this planet.
          </p>
        </div>
        <Link href={`/planets/${planetId}/feed`}>
          <Button variant="secondary" size="sm">
            Back to feed
          </Button>
        </Link>
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-3">
        <label
          htmlFor="mod-status-filter"
          className="text-sm font-medium"
          style={{ color: 'var(--wt-text-muted)' }}
        >
          Status
        </label>
        <select
          id="mod-status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ReportStatus | '')}
          className={selectClass}
          style={{ borderColor: 'var(--wt-border)', color: 'var(--wt-text)' }}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      {reportsState.status === 'error' ? (
        <ErrorState
          message={reportsState.message}
          isOffline={reportsState.offline}
          isUnauthorized={reportsState.unauthorized}
          onRetry={() => setRetry((n) => n + 1)}
        />
      ) : reportsState.status === 'success' && reportsState.reports.length === 0 ? (
        <EmptyState
          title="No reports to review"
          description="There are no reports matching the current filter."
          variant="moderation"
        />
      ) : (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: 'var(--wt-border)' }}
        >
          <table className="w-full text-sm" aria-label="Reports">
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--wt-text-muted)' }}
                >
                  Target type
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--wt-text-muted)' }}
                >
                  Reason
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--wt-text-muted)' }}
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--wt-text-muted)' }}
                >
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--wt-border)' }}>
              {reportsState.status === 'loading'
                ? Array.from({ length: 5 }).map((_, i) => <ReportRowSkeleton key={i} />)
                : reportsState.reports.map((report) => {
                    const badge = STATUS_BADGE_STYLES[report.status];
                    return (
                      <tr
                        key={report.id}
                        className="hover:bg-slate-50 transition-colors duration-100"
                      >
                        <td className="px-4 py-3" style={{ color: 'var(--wt-text)' }}>
                          {report.targetType}
                        </td>
                        <td
                          className="px-4 py-3 max-w-xs truncate"
                          title={report.reason}
                          style={{ color: 'var(--wt-text)' }}
                        >
                          {report.reason}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{ backgroundColor: badge.bg, color: badge.text }}
                          >
                            {report.status}
                          </span>
                        </td>
                        <td
                          className="px-4 py-3 whitespace-nowrap"
                          style={{ color: 'var(--wt-text-muted)' }}
                        >
                          <time dateTime={report.createdAt}>
                            {new Date(report.createdAt).toLocaleDateString()}
                          </time>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/planets/${planetId}/moderation/${report.id}`}
                            className="text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488] rounded"
                            style={{ color: 'var(--wt-teal)' }}
                          >
                            Review
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      )}

      {reportsState.status === 'success' && reportsState.hasMore ? (
        <div className="flex justify-center pt-2">
          <Button
            variant="secondary"
            size="sm"
            isLoading={loadingMore}
            onClick={() => void handleLoadMore()}
          >
            Load more
          </Button>
        </div>
      ) : null}
    </div>
  );
}
