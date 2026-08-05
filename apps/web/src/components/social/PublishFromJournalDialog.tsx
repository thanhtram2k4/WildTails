'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { apiGet } from '@/lib/api-helpers';
import type { JournalResponse } from '@wildtails/contracts';

interface PublishFromJournalDialogProps {
  planetId: string;
  onConfirm: (body: string, journalId: string) => Promise<void>;
  onClose: () => void;
}

type JournalListState =
  | { status: 'loading' }
  | { status: 'success'; journals: JournalResponse[] }
  | { status: 'error'; message: string };

export function PublishFromJournalDialog({ onConfirm, onClose }: PublishFromJournalDialogProps) {
  const [journalState, setJournalState] = useState<JournalListState>({ status: 'loading' });
  const [selectedId, setSelectedId] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const firstFocusRef = useRef<HTMLSelectElement | null>(null);

  useEffect(() => {
    apiGet<JournalResponse[]>('/journals?limit=50').then(
      (env) => {
        setJournalState({
          status: 'success',
          journals: Array.isArray(env.data) ? env.data : [],
        });
      },
      (err: unknown) => {
        setJournalState({
          status: 'error',
          message: err instanceof Error ? err.message : 'Failed to load journals.',
        });
      },
    );
  }, []);

  useEffect(() => {
    firstFocusRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
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

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !body.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onConfirm(body.trim(), selectedId);
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create post.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = [
    'w-full rounded-lg border px-3 py-2 text-sm',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488] focus-visible:ring-offset-1',
  ].join(' ');
  const inputStyle = { borderColor: 'var(--wt-border)', color: 'var(--wt-text)' };

  return (
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
        aria-labelledby="pfjd-title"
        className="w-full max-w-lg rounded-xl shadow-lg p-6 flex flex-col gap-5"
        style={{ backgroundColor: 'var(--wt-card)' }}
      >
        <div className="flex items-center justify-between">
          <h2 id="pfjd-title" className="text-lg font-semibold" style={{ color: 'var(--wt-navy)' }}>
            Share from journal
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
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

        {/* Privacy notice */}
        <div
          className="rounded-lg p-3 text-sm"
          style={{ backgroundColor: '#f0fdfa', borderLeft: '3px solid #0d9488' }}
        >
          <p style={{ color: 'var(--wt-navy)' }}>
            <strong>Your journal remains private.</strong> Write a message to share with the planet.
            Your journal content is never shown to other users.
          </p>
        </div>

        <form onSubmit={(e) => void handleConfirm(e)} className="flex flex-col gap-4">
          {/* Journal selector */}
          <div>
            <label
              htmlFor="pfjd-journal-select"
              className="block text-xs font-semibold mb-1"
              style={{ color: 'var(--wt-text-muted)' }}
            >
              Select a journal <span aria-hidden="true">*</span>
            </label>
            {journalState.status === 'loading' ? (
              <div
                className="h-9 rounded-lg border"
                style={{ borderColor: 'var(--wt-border)', backgroundColor: '#f1f5f9' }}
                aria-busy="true"
                aria-label="Loading journals"
              />
            ) : journalState.status === 'error' ? (
              <p className="text-sm text-red-600" role="alert">
                {journalState.message}
              </p>
            ) : (
              <select
                ref={firstFocusRef}
                id="pfjd-journal-select"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                required
                className={inputClass}
                style={inputStyle}
                aria-required="true"
              >
                <option value="">— Choose a journal —</option>
                {journalState.journals.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Custom post body */}
          <div>
            <label
              htmlFor="pfjd-body"
              className="block text-xs font-semibold mb-1"
              style={{ color: 'var(--wt-text-muted)' }}
            >
              Your message to the planet <span aria-hidden="true">*</span>
            </label>
            <textarea
              id="pfjd-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={5000}
              required
              rows={4}
              placeholder="What would you like to share about this topic?"
              className={[inputClass, 'resize-y'].join(' ')}
              style={inputStyle}
              aria-required="true"
              aria-describedby="pfjd-body-count"
            />
            <p
              id="pfjd-body-count"
              className="mt-0.5 text-right text-xs"
              style={{ color: 'var(--wt-text-muted)' }}
              aria-live="polite"
            >
              {body.length}/5000
            </p>
          </div>

          {submitError ? (
            <p className="text-sm text-red-600" role="alert">
              {submitError}
            </p>
          ) : null}

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={submitting}
              disabled={submitting || !selectedId || !body.trim()}
            >
              Share to planet
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
