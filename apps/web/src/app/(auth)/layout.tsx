import type { ReactNode } from 'react';

/**
 * Auth layout — centered card, minimal chrome, light theme.
 * Unauthenticated users only. No nav header.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-12"
      style={{ backgroundColor: 'var(--wt-bg)' }}
    >
      <div className="w-full max-w-sm">
        {/* WildTails wordmark with cat silhouette */}
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2">
            {/* Simple inline cat head silhouette — placeholder until design assets land */}
            <svg
              width="28"
              height="28"
              viewBox="0 0 28 28"
              fill="none"
              aria-hidden="true"
              focusable="false"
            >
              {/* Ear left */}
              <path d="M4 10 L7 3 L12 9" fill="#1e3a5f" />
              {/* Ear right */}
              <path d="M24 10 L21 3 L16 9" fill="#1e3a5f" />
              {/* Head */}
              <ellipse cx="14" cy="16" rx="10" ry="9" fill="#1e3a5f" />
              {/* Eyes */}
              <circle cx="10" cy="15" r="1.5" fill="#f8fafc" />
              <circle cx="18" cy="15" r="1.5" fill="#f8fafc" />
              {/* Nose */}
              <path d="M13 18 L14 19 L15 18" fill="#f59e0b" stroke="none" />
            </svg>
            <span className="text-3xl font-bold tracking-tight" style={{ color: 'var(--wt-navy)' }}>
              Wild
              <span style={{ color: 'var(--wt-yellow)' }}>Tails</span>
            </span>
          </div>
          <p className="text-sm" style={{ color: 'var(--wt-text-muted)' }}>
            Catalyst Verse
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-xl border p-8 shadow-sm"
          style={{
            backgroundColor: 'var(--wt-card)',
            borderColor: 'var(--wt-border)',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
