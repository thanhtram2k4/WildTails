'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { AvatarPreview } from '@/components/avatar/avatar-preview';
import { Button } from '@/components/ui/button';
import type { AvatarConfig } from '@wildtails/contracts';

/** The eight default planet slugs with display names. */
const DEFAULT_PLANETS = [
  { slug: 'learning', name: 'Learning', id: '' },
  { slug: 'sports', name: 'Sports', id: '' },
  { slug: 'finance', name: 'Finance', id: '' },
  { slug: 'work', name: 'Work', id: '' },
  { slug: 'travel', name: 'Travel', id: '' },
  { slug: 'health', name: 'Health', id: '' },
  { slug: 'pets', name: 'Pets', id: '' },
  { slug: 'art', name: 'Art', id: '' },
] as const;

interface PlanetStub {
  id: string;
  name: string;
  slug: string;
}

/** Planets dropdown — fetches planet list once on open. */
function PlanetsMenu() {
  const [open, setOpen] = useState(false);
  const [planets, setPlanets] = useState<PlanetStub[]>([]);
  const [loaded, setLoaded] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || loaded) return;
    const fallback = DEFAULT_PLANETS.map((p, i) => ({ id: String(i), name: p.name, slug: p.slug }));
    async function loadPlanets() {
      try {
        const { apiGet } = await import('@/lib/api-helpers');
        const env = await apiGet<PlanetStub[]>('/planets');
        if (Array.isArray(env.data) && env.data.length > 0) {
          setPlanets(env.data);
        } else {
          setPlanets(fallback);
        }
      } catch {
        setPlanets(fallback);
      } finally {
        setLoaded(true);
      }
    }
    void loadPlanets();
  }, [open, loaded]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="text-sm text-slate-200 hover:text-white rounded px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        Planets
        <span className="ml-1 text-xs" aria-hidden="true">
          {open ? '\u25B2' : '\u25BC'}
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Planets"
          className="absolute left-0 top-full mt-1 w-44 rounded-xl shadow-lg border py-1 z-50"
          style={{ backgroundColor: 'var(--wt-card)', borderColor: 'var(--wt-border)' }}
        >
          {planets.length === 0 ? (
            <p className="px-4 py-2 text-xs" style={{ color: 'var(--wt-text-muted)' }}>
              Loading...
            </p>
          ) : (
            planets.map((p) => (
              <Link
                key={p.id || p.slug}
                href={`/planets/${p.id || p.slug}/feed`}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-sm hover:bg-teal-50 focus-visible:outline-none focus-visible:bg-teal-50"
                style={{ color: 'var(--wt-navy)' }}
              >
                {p.name}
              </Link>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

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
            <Link
              href="/cabin"
              className="text-sm text-slate-200 hover:text-white rounded px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              Cabin
            </Link>
            <Link
              href="/goals"
              className="text-sm text-slate-200 hover:text-white rounded px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              Goals
            </Link>
            <PlanetsMenu />

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
