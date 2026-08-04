'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';

/**
 * Root landing page.
 * - While auth state is resolving: show a minimal loading screen.
 * - Authenticated: redirect to /dashboard.
 * - Unauthenticated: redirect to /login.
 */
export default function RootPage() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/dashboard');
    } else if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      role="status"
      aria-label="Loading WildTails"
    >
      <div className="flex flex-col items-center gap-4">
        <span
          className="motion-safe:animate-spin h-10 w-10 rounded-full border-4 border-slate-200 border-t-[#0d9488]"
          aria-hidden="true"
        />
        <p className="text-sm" style={{ color: 'var(--wt-text-muted)' }}>
          Loading WildTails...
        </p>
      </div>
    </div>
  );
}
