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
 * App shell layout.
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
        role="status"
        aria-label="Loading"
      >
        <span
          className="motion-safe:animate-spin h-10 w-10 rounded-full border-4 border-zinc-600 border-t-amber-500"
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
    <div className="flex min-h-screen flex-col bg-zinc-900">
      {/* App header */}
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-900/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link
            href="/dashboard"
            className="text-lg font-bold text-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
          >
            WildTails
          </Link>

          <nav className="flex items-center gap-4" aria-label="Main navigation">
            <Link
              href="/dashboard"
              className="text-sm text-zinc-400 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded px-2 py-1"
            >
              Home
            </Link>

            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2">
                <AvatarPreview config={DEFAULT_AVATAR} size={32} />
                <span className="hidden text-sm text-zinc-300 sm:block">
                  {user?.displayName ?? ''}
                </span>
              </span>

              <Button variant="ghost" size="sm" onClick={() => void handleLogout()}>
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
