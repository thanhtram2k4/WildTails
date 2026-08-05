'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ApiError, apiPost } from '@/lib/api-helpers';
import type { ReportTargetType } from '@wildtails/contracts';

interface ReportDialogProps {
  targetType: ReportTargetType;
  targetId: string;
  onClose: () => void;
}

type DialogState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'success' }
  | { status: 'conflict' }
  | { status: 'error'; message: string };

export function ReportDialog({ targetType, targetId, onClose }: ReportDialogProps) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [dialogState, setDialogState] = useState<DialogState>({ status: 'idle' });
  const firstFocusRef = useRef<HTMLTextAreaElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Focus trap + ESC to close
  useEffect(() => {
    firstFocusRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      // Basic focus trap
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) return;
    setDialogState({ status: 'submitting' });
    try {
      await apiPost('/reports', {
        targetType,
        targetId,
        reason: reason.trim(),
        description: description.trim() || undefined,
      });
      setDialogState({ status: 'success' });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setDialogState({ status: 'conflict' });
      } else {
        setDialogState({
          status: 'error',
          message: err instanceof Error ? err.message : 'Failed to submit report.',
        });
      }
    }
  }

  const isSubmitting = dialogState.status === 'submitting';

  const inputClass = [
    'w-full rounded-lg border px-3 py-2 text-sm',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488] focus-visible:ring-offset-1',
  ].join(' ');
  const inputStyle = { borderColor: 'var(--wt-border)', color: 'var(--wt-text)' };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-dialog-title"
        className="w-full max-w-md rounded-xl shadow-lg p-6 flex flex-col gap-4"
        style={{ backgroundColor: 'var(--wt-card)' }}
      >
        <div className="flex items-center justify-between">
          <h2
            id="report-dialog-title"
            className="text-lg font-semibold"
            style={{ color: 'var(--wt-navy)' }}
          >
            Report content
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close report dialog"
            className="rounded p-1 text-[#64748b] hover:text-[#1e3a5f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488]"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {dialogState.status === 'success' ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0d9488"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <p className="font-medium" style={{ color: 'var(--wt-navy)' }}>
              Report submitted
            </p>
            <p className="text-sm" style={{ color: 'var(--wt-text-muted)' }}>
              Thank you. Our moderation team will review your report.
            </p>
            <Button size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : dialogState.status === 'conflict' ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <p className="text-sm text-amber-700">
              You already have a pending report for this content.
            </p>
            <Button size="sm" variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="report-reason"
                className="block text-xs font-semibold mb-1"
                style={{ color: 'var(--wt-text-muted)' }}
              >
                Reason <span aria-hidden="true">*</span>
              </label>
              <textarea
                ref={firstFocusRef}
                id="report-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={100}
                required
                rows={2}
                placeholder="Briefly describe the issue..."
                className={[inputClass, 'resize-none'].join(' ')}
                style={inputStyle}
                aria-required="true"
                aria-describedby="report-reason-count"
              />
              <p
                id="report-reason-count"
                className="mt-0.5 text-right text-xs"
                style={{ color: 'var(--wt-text-muted)' }}
                aria-live="polite"
              >
                {reason.length}/100
              </p>
            </div>

            <div>
              <label
                htmlFor="report-description"
                className="block text-xs font-semibold mb-1"
                style={{ color: 'var(--wt-text-muted)' }}
              >
                Additional details (optional)
              </label>
              <textarea
                id="report-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
                rows={4}
                placeholder="Provide more context if needed..."
                className={[inputClass, 'resize-y'].join(' ')}
                style={inputStyle}
                aria-describedby="report-description-count"
              />
              <p
                id="report-description-count"
                className="mt-0.5 text-right text-xs"
                style={{ color: 'var(--wt-text-muted)' }}
                aria-live="polite"
              >
                {description.length}/1000
              </p>
            </div>

            {dialogState.status === 'error' ? (
              <p className="text-sm text-red-600" role="alert">
                {dialogState.message}
              </p>
            ) : null}

            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="danger"
                size="sm"
                isLoading={isSubmitting}
                disabled={isSubmitting || !reason.trim()}
              >
                Submit report
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
