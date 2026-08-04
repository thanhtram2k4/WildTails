'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { AvatarPreview } from '@/components/avatar/avatar-preview';
import { Button } from '@/components/ui/button';
import type { AvatarConfig } from '@wildtails/contracts';

const DEFAULT_AVATAR: AvatarConfig = {
  base: 'cat-round',
  fur: 'gray',
  eyes: 'round',
  outfit: 'none',
  accessory: 'none',
  background: 'none',
};

/**
 * App shell layout — light theme.
 * Guards authenticated routes — redirects to /login if unauthenticated.
 * Shows a loading screen while auth state is resolving.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  const { status, user, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: 'var(--wt-bg)' }}
        role="status"
        aria-label="Loading"
      >
        <span
          className="motion-safe:animate-spin h-10 w-10 rounded-full border-4 border-slate-200 border-t-[#0d9488]"
          aria-hidden="true"
        />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    // Redirect is in progress — render nothing to avoid flash of content.
    return null;
  }

  async function handleLogout() {
    await signOut();
    router.replace('/login');
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: 'var(--wt-bg)' }}>
      {/* App header — navy background with white text */}
      <header
        className="sticky top-0 z-40 border-b"
        style={{
          backgroundColor: 'var(--wt-navy)',
          borderBottomColor: 'rgba(255,255,255,0.1)',
        }}
      >
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link
            href="/dashboard"
            className="text-lg font-bold rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1e3a5f]"
            style={{ color: 'var(--wt-yellow)' }}
          >
            WildTails
          </Link>

          <nav className="flex items-center gap-4" aria-label="Main navigation">
            <Link
              href="/dashboard"
              className="text-sm text-slate-200 hover:text-white rounded px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              Home
            </Link>

            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2">
                <AvatarPreview config={DEFAULT_AVATAR} size={32} />
                <span className="hidden text-sm text-slate-200 sm:block">
                  {user?.displayName ?? ''}
                </span>
              </span>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleLogout()}
                className="!text-slate-200 hover:!bg-white/10 hover:!text-white"
              >
                Sign out
              </Button>
            </div>
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
