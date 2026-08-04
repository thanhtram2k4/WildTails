import type { ReactNode } from 'react';

/**
 * Auth layout — centered card, minimal chrome.
 * Unauthenticated users only. No nav header.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12 bg-zinc-900">
      <div className="w-full max-w-sm">
        {/* WildTails wordmark */}
        <div className="mb-8 text-center">
          <span className="text-3xl font-bold tracking-tight text-amber-400">WildTails</span>
          <p className="mt-1 text-sm text-zinc-500">Catalyst Verse</p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-zinc-700 bg-zinc-800/60 p-8 shadow-xl">
          {children}
        </div>
      </div>
    </div>
  );
}
