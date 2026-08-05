'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { apiGet, apiPost, apiDelete, ApiError } from '@/lib/api-helpers';
import type { SharePermissionResponse } from '@wildtails/contracts';

interface SharingPanelProps {
  journalId: string;
}

type FetchState =
  | { status: 'loading' }
  | { status: 'success'; shares: SharePermissionResponse[] }
  | { status: 'error'; message: string };

export function SharingPanel({ journalId }: SharingPanelProps) {
  const [state, setState] = useState<FetchState>({ status: 'loading' });
  const setRef = useRef(setState);
  const [retry, setRetry] = useState(0);
  const [grantUserId, setGrantUserId] = useState('');
  const [grantExpiry, setGrantExpiry] = useState('');
  const [granting, setGranting] = useState(false);
  const [grantError, setGrantError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRef.current({ status: 'loading' });
    try {
      const env = await apiGet<SharePermissionResponse[]>(`/journals/${journalId}/shares`);
      setRef.current({ status: 'success', shares: env.data });
    } catch (err) {
      setRef.current({
        status: 'error',
        message: err instanceof Error ? err.message : 'Failed to load shares.',
      });
    }
  }, [journalId]);

  useEffect(() => {
    void load();
  }, [load, retry]);

  async function handleGrant(e: React.FormEvent) {
    e.preventDefault();
    const userId = grantUserId.trim();
    if (!userId) return;
    setGranting(true);
    setGrantError(null);
    try {
      const body: Record<string, string> = { journalId, userId };
      if (grantExpiry) body['expiresAt'] = new Date(grantExpiry).toISOString();
      await apiPost(`/journals/${journalId}/share`, body);
      setGrantUserId('');
      setGrantExpiry('');
      setRetry((n) => n + 1);
    } catch (err) {
      setGrantError(err instanceof Error ? err.message : 'Failed to grant access.');
    } finally {
      setGranting(false);
    }
  }

  async function handleRevoke(shareId: string) {
    setRevokingId(shareId);
    try {
      await apiDelete(`/journals/${journalId}/share/${shareId}`);
      setRetry((n) => n + 1);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to revoke access.');
    } finally {
      setRevokingId(null);
    }
  }

  function formatExpiry(expiresAt: string | null): string {
    if (!expiresAt) return 'No expiry';
    const d = new Date(expiresAt);
    return d.toLocaleDateString();
  }

  return (
    <section
      aria-labelledby="sharing-heading"
      className="rounded-xl border p-4 space-y-4"
      style={{ backgroundColor: 'var(--wt-card)', borderColor: 'var(--wt-border)' }}
    >
      <h2
        id="sharing-heading"
        className="text-sm font-semibold"
        style={{ color: 'var(--wt-navy)' }}
      >
        Shared with
      </h2>

      {state.status === 'loading' ? (
        <div className="space-y-2" aria-label="Loading shares">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-8 rounded bg-slate-200 motion-safe:animate-pulse"
              aria-hidden="true"
            />
          ))}
        </div>
      ) : state.status === 'error' ? (
        <div className="text-sm text-red-600 flex gap-2 items-center">
          <span>{state.message}</span>
          <button
            type="button"
            onClick={() => setRetry((n) => n + 1)}
            className="underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0d9488]"
          >
            Retry
          </button>
        </div>
      ) : state.shares.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--wt-text-muted)' }}>
          No users have access yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {state.shares.map((share) => (
            <li
              key={share.id}
              className="flex items-center justify-between gap-2 rounded border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--wt-border)' }}
            >
              <div>
                <span className="font-mono text-xs" style={{ color: 'var(--wt-navy)' }}>
                  {share.userId}
                </span>
                <span className="ml-2 text-xs" style={{ color: 'var(--wt-text-muted)' }}>
                  {formatExpiry(share.expiresAt)}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                isLoading={revokingId === share.id}
                onClick={() => void handleRevoke(share.id)}
                className="!text-red-500 hover:!bg-red-50"
                aria-label={`Revoke access for ${share.userId}`}
              >
                Revoke
              </Button>
            </li>
          ))}
        </ul>
      )}

      {/* Grant access form */}
      <form
        onSubmit={(e) => void handleGrant(e)}
        className="space-y-2 pt-2 border-t"
        style={{ borderColor: 'var(--wt-border)' }}
      >
        <h3
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: 'var(--wt-text-muted)' }}
        >
          Grant access
        </h3>
        <div>
          <label htmlFor="share-user-id" className="sr-only">
            User ID
          </label>
          <input
            id="share-user-id"
            type="text"
            value={grantUserId}
            onChange={(e) => setGrantUserId(e.target.value)}
            placeholder="User ID (UUID)"
            required
            className={[
              'w-full rounded border px-2 py-1 text-sm',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488]',
            ].join(' ')}
            style={{ borderColor: 'var(--wt-border)', color: 'var(--wt-text)' }}
            aria-describedby={grantError ? 'share-error' : undefined}
          />
        </div>
        <div>
          <label
            htmlFor="share-expiry"
            className="text-xs"
            style={{ color: 'var(--wt-text-muted)' }}
          >
            Expires (optional)
          </label>
          <input
            id="share-expiry"
            type="date"
            value={grantExpiry}
            onChange={(e) => setGrantExpiry(e.target.value)}
            min={new Date().toISOString().slice(0, 10)}
            className={[
              'mt-1 w-full rounded border px-2 py-1 text-sm',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488]',
            ].join(' ')}
            style={{ borderColor: 'var(--wt-border)', color: 'var(--wt-text)' }}
          />
        </div>
        {grantError ? (
          <p id="share-error" className="text-xs text-red-600">
            {grantError}
          </p>
        ) : null}
        <Button
          type="submit"
          size="sm"
          isLoading={granting}
          disabled={!grantUserId.trim() || granting}
        >
          Grant access
        </Button>
      </form>
    </section>
  );
}
