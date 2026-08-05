'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/loading-skeleton';
import { ApiError, apiGet, apiPatch, isOfflineError, isUnauthorizedError } from '@/lib/api-helpers';
import type { ReportResponse } from '@wildtails/contracts';

type ReportState =
  | { status: 'loading' }
  | { status: 'success'; report: ReportResponse }
  | { status: 'error'; message: string; offline: boolean; unauthorized: boolean };

type ActionState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'conflict' }
  | { status: 'error'; message: string };

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: '#fef9c3', text: '#92400e' },
  REVIEWED: { bg: '#dbeafe', text: '#1e40af' },
  DISMISSED: { bg: '#f1f5f9', text: '#64748b' },
  ACTIONED: { bg: '#dcfce7', text: '#166534' },
};

export default function ModerationDetailPage({
  params,
}: {
  params: Promise<{ planetId: string; reportId: string }>;
}) {
  const { planetId, reportId } = use(params);
  const router = useRouter();

  const [reportState, setReportState] = useState<ReportState>({ status: 'loading' });
  const [note, setNote] = useState('');
  const [actionState, setActionState] = useState<ActionState>({ status: 'idle' });

  useEffect(() => {
    let cancelled = false;
    async function loadReport() {
      setReportState({ status: 'loading' });
      try {
        const env = await apiGet<ReportResponse>(`/reports/${reportId}`);
        if (!cancelled) setReportState({ status: 'success', report: env.data });
      } catch (err: unknown) {
        if (!cancelled) {
          setReportState({
            status: 'error',
            message: err instanceof Error ? err.message : 'Could not load report.',
            offline: isOfflineError(err),
            unauthorized: isUnauthorizedError(err),
          });
        }
      }
    }
    void loadReport();
    return () => {
      cancelled = true;
    };
  }, [reportId]);

  async function handleAction(status: 'DISMISSED' | 'ACTIONED') {
    setActionState({ status: 'submitting' });
    try {
      await apiPatch(`/reports/${reportId}`, {
        status,
        note: note.trim() || undefined,
      });
      router.push(`/planets/${planetId}/moderation`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setActionState({ status: 'conflict' });
      } else {
        setActionState({
          status: 'error',
          message: err instanceof Error ? err.message : 'Failed to process report.',
        });
      }
    }
  }

  const isSubmitting = actionState.status === 'submitting';
  const isPending = reportState.status === 'success' && reportState.report.status === 'PENDING';

  const inputClass = [
    'w-full rounded-lg border px-3 py-2 text-sm resize-y',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488] focus-visible:ring-offset-1',
  ].join(' ');

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb">
        <Link
          href={`/planets/${planetId}/moderation`}
          className="text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488] rounded"
          style={{ color: 'var(--wt-teal)' }}
        >
          &larr; Back to queue
        </Link>
      </nav>

      <h1 className="text-2xl font-bold" style={{ color: 'var(--wt-navy)' }}>
        Report detail
      </h1>

      {reportState.status === 'loading' ? (
        <div
          className="rounded-xl border p-6 flex flex-col gap-4"
          style={{ backgroundColor: 'var(--wt-card)', borderColor: 'var(--wt-border)' }}
          role="status"
          aria-label="Loading report"
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-64" />
            </div>
          ))}
        </div>
      ) : reportState.status === 'error' ? (
        <ErrorState
          message={reportState.message}
          isOffline={reportState.offline}
          isUnauthorized={reportState.unauthorized}
          onRetry={() => {
            // Re-mount by incrementing a key would require param state —
            // instead we just reload the page.
            window.location.reload();
          }}
        />
      ) : (
        <div
          className="rounded-xl border p-6 flex flex-col gap-5"
          style={{ backgroundColor: 'var(--wt-card)', borderColor: 'var(--wt-border)' }}
        >
          {/* Report fields */}
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt
                className="text-xs font-semibold uppercase"
                style={{ color: 'var(--wt-text-muted)' }}
              >
                Target type
              </dt>
              <dd className="mt-1 text-sm font-medium" style={{ color: 'var(--wt-navy)' }}>
                {reportState.report.targetType}
              </dd>
            </div>
            <div>
              <dt
                className="text-xs font-semibold uppercase"
                style={{ color: 'var(--wt-text-muted)' }}
              >
                Target ID
              </dt>
              <dd
                className="mt-1 text-xs font-mono break-all"
                style={{ color: 'var(--wt-text-muted)' }}
              >
                {reportState.report.targetId}
              </dd>
            </div>
            <div>
              <dt
                className="text-xs font-semibold uppercase"
                style={{ color: 'var(--wt-text-muted)' }}
              >
                Status
              </dt>
              <dd className="mt-1">
                {(() => {
                  const badge = STATUS_BADGE[reportState.report.status] ?? {
                    bg: '#f1f5f9',
                    text: '#64748b',
                  };
                  return (
                    <span
                      className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: badge.bg, color: badge.text }}
                    >
                      {reportState.report.status}
                    </span>
                  );
                })()}
              </dd>
            </div>
            <div>
              <dt
                className="text-xs font-semibold uppercase"
                style={{ color: 'var(--wt-text-muted)' }}
              >
                Reported
              </dt>
              <dd className="mt-1 text-sm" style={{ color: 'var(--wt-text)' }}>
                <time dateTime={reportState.report.createdAt}>
                  {new Date(reportState.report.createdAt).toLocaleString()}
                </time>
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt
                className="text-xs font-semibold uppercase"
                style={{ color: 'var(--wt-text-muted)' }}
              >
                Reason
              </dt>
              <dd className="mt-1 text-sm" style={{ color: 'var(--wt-text)' }}>
                {reportState.report.reason}
              </dd>
            </div>
          </dl>

          <hr style={{ borderColor: 'var(--wt-border)' }} />

          {/* Actions — only for PENDING */}
          {isPending ? (
            <div className="flex flex-col gap-4">
              <div>
                <label
                  htmlFor="mod-note"
                  className="block text-xs font-semibold mb-1"
                  style={{ color: 'var(--wt-text-muted)' }}
                >
                  Moderator note (optional)
                </label>
                <textarea
                  id="mod-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Add an internal note about your decision..."
                  className={inputClass}
                  style={{ borderColor: 'var(--wt-border)', color: 'var(--wt-text)' }}
                />
              </div>

              {actionState.status === 'conflict' ? (
                <p className="text-sm text-amber-700 font-medium" role="alert">
                  This report has already been processed.
                </p>
              ) : actionState.status === 'error' ? (
                <p className="text-sm text-red-600" role="alert">
                  {actionState.message}
                </p>
              ) : null}

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                  onClick={() => void handleAction('DISMISSED')}
                >
                  Dismiss
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  isLoading={isSubmitting}
                  disabled={isSubmitting}
                  onClick={() => void handleAction('ACTIONED')}
                >
                  Take action
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--wt-text-muted)' }}>
              This report has already been processed and cannot be changed.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
