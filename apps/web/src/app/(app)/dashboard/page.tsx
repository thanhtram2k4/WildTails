'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { AvatarPreview } from '@/components/avatar/avatar-preview';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import {
  AvatarConfigSchema,
  type AvatarConfig,
  type PlanetResponse,
  type UserProfileResponse,
} from '@wildtails/contracts';

const DEFAULT_AVATAR: AvatarConfig = {
  base: 'cat-round',
  fur: 'gray',
  eyes: 'round',
  outfit: 'none',
  accessory: 'none',
  background: 'stars',
};

const PLANET_ICONS: Record<string, string> = {
  learning: '',
  sports: '',
  finance: '',
  work: '',
  travel: '',
  health: '',
  pets: '',
  art: '',
};

type FetchState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };

async function loadProfile(): Promise<UserProfileResponse> {
  const res = await apiFetch('/users/me');
  if (!res.ok) {
    throw new Error(
      res.status === 401
        ? 'Session expired. Please sign in again.'
        : 'Failed to load your profile.',
    );
  }
  const envelope = (await res.json()) as {
    success: boolean;
    data: UserProfileResponse;
  };
  if (!envelope.success) throw new Error('Failed to load profile.');
  return envelope.data;
}

async function loadMyPlanets(): Promise<PlanetResponse[]> {
  const res = await apiFetch('/users/me/planets');
  if (!res.ok) throw new Error('Failed to load your planets.');
  const envelope = (await res.json()) as {
    success: boolean;
    data: PlanetResponse[];
  };
  if (!envelope.success) throw new Error('Failed to load planets.');
  return envelope.data;
}

export default function DashboardPage() {
  const { user } = useAuth();

  const [profileState, setProfileState] = useState<FetchState<UserProfileResponse>>({
    status: 'idle',
  });
  const [planetsState, setPlanetsState] = useState<FetchState<PlanetResponse[]>>({
    status: 'idle',
  });

  // Increment to trigger a retry.
  const [profileRetry, setProfileRetry] = useState(0);
  const [planetsRetry, setPlanetsRetry] = useState(0);

  // Stable setter refs so effects don't need to list state setters as deps.
  const setProfileRef = useRef(setProfileState);
  const setPlanetsRef = useRef(setPlanetsState);

  useEffect(() => {
    let cancelled = false;
    setProfileRef.current({ status: 'loading' });
    loadProfile().then(
      (data) => {
        if (!cancelled) setProfileRef.current({ status: 'success', data });
      },
      (err: unknown) => {
        if (!cancelled)
          setProfileRef.current({
            status: 'error',
            message: err instanceof Error ? err.message : 'Failed to load profile.',
          });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [profileRetry]);

  useEffect(() => {
    let cancelled = false;
    setPlanetsRef.current({ status: 'loading' });
    loadMyPlanets().then(
      (data) => {
        if (!cancelled) setPlanetsRef.current({ status: 'success', data });
      },
      (err: unknown) => {
        if (!cancelled)
          setPlanetsRef.current({
            status: 'error',
            message: err instanceof Error ? err.message : 'Network error loading planets.',
          });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [planetsRetry]);

  const resolvedAvatar =
    profileState.status === 'success' && profileState.data.avatarConfig
      ? (AvatarConfigSchema.safeParse(profileState.data.avatarConfig).data ?? DEFAULT_AVATAR)
      : DEFAULT_AVATAR;

  const displayName =
    profileState.status === 'success' ? profileState.data.displayName : (user?.displayName ?? '');

  return (
    <div className="flex flex-col gap-8">
      {/* Welcome banner */}
      <section
        className="flex items-center gap-6 rounded-xl border p-6"
        style={{ backgroundColor: 'var(--wt-card)', borderColor: 'var(--wt-border)' }}
      >
        <div className="shrink-0">
          {profileState.status === 'loading' ? (
            <div
              className="h-20 w-20 rounded-full bg-slate-200 motion-safe:animate-pulse"
              aria-hidden="true"
            />
          ) : (
            <AvatarPreview config={resolvedAvatar} size={80} />
          )}
        </div>
        <div>
          <p className="text-sm" style={{ color: 'var(--wt-text-muted)' }}>
            Welcome back,
          </p>
          {profileState.status === 'loading' ? (
            <div
              className="mt-1 h-7 w-40 rounded bg-slate-200 motion-safe:animate-pulse"
              aria-hidden="true"
            />
          ) : (
            <h1 className="text-2xl font-bold" style={{ color: 'var(--wt-navy)' }}>
              {displayName || 'Explorer'}
            </h1>
          )}
          {profileState.status === 'success' && profileState.data.bio ? (
            <p className="mt-2 text-sm" style={{ color: 'var(--wt-text-muted)' }}>
              {profileState.data.bio}
            </p>
          ) : null}
          {profileState.status === 'error' ? (
            <div className="mt-2 flex items-center gap-2">
              <p className="text-sm text-red-600">{profileState.message}</p>
              <Button variant="ghost" size="sm" onClick={() => setProfileRetry((n) => n + 1)}>
                Retry
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      {/* Planets section */}
      <section aria-labelledby="planets-heading">
        <div className="mb-4 flex items-center justify-between">
          <h2
            id="planets-heading"
            className="text-lg font-semibold"
            style={{ color: 'var(--wt-navy)' }}
          >
            Your planets
          </h2>
          <Link
            href="/onboarding"
            className="text-sm underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488] rounded"
            style={{ color: 'var(--wt-teal)' }}
          >
            Manage
          </Link>
        </div>

        {planetsState.status === 'loading' ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Loading planets">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-xl bg-slate-200 motion-safe:animate-pulse"
                aria-hidden="true"
              />
            ))}
          </div>
        ) : planetsState.status === 'error' ? (
          <div
            className="flex flex-col items-center gap-3 rounded-xl border py-8 text-center"
            style={{ borderColor: 'var(--wt-border)' }}
          >
            <p className="text-sm text-red-600">{planetsState.message}</p>
            <Button variant="secondary" size="sm" onClick={() => setPlanetsRetry((n) => n + 1)}>
              Retry
            </Button>
          </div>
        ) : planetsState.status === 'success' && planetsState.data.length === 0 ? (
          <div
            className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-10 text-center"
            style={{ borderColor: 'var(--wt-border)' }}
          >
            <p style={{ color: 'var(--wt-text-muted)' }}>You have not joined any planets yet.</p>
            <Link href="/onboarding">
              <Button size="sm">Explore planets</Button>
            </Link>
          </div>
        ) : planetsState.status === 'success' ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {planetsState.data.map((planet) => (
              <div
                key={planet.id}
                className="flex flex-col items-center gap-2 rounded-xl border p-4 text-center"
                style={{ backgroundColor: 'var(--wt-card)', borderColor: 'var(--wt-border)' }}
              >
                <span className="text-3xl" aria-hidden="true">
                  {PLANET_ICONS[planet.slug] ?? ''}
                </span>
                <p className="text-sm font-semibold capitalize" style={{ color: 'var(--wt-navy)' }}>
                  {planet.name}
                </p>
                <p className="text-xs" style={{ color: 'var(--wt-text-muted)' }}>
                  {planet.memberCount.toLocaleString()} members
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {/* Quick actions */}
      <section aria-labelledby="actions-heading">
        <h2
          id="actions-heading"
          className="mb-4 text-lg font-semibold"
          style={{ color: 'var(--wt-navy)' }}
        >
          Quick actions
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <QuickAction
            href="#"
            label="Write a journal entry"
            description="Capture today's thoughts"
            icon=""
          />
          <QuickAction
            href="#"
            label="View planet feed"
            description="See what's happening"
            icon=""
          />
          <QuickAction
            href="#"
            label="Set a goal"
            description="Plan your next achievement"
            icon=""
          />
        </div>
      </section>
    </div>
  );
}

function QuickAction({
  href,
  label,
  description,
  icon,
}: {
  href: string;
  label: string;
  description: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-xl border p-4 transition-colors hover:border-[#0d9488] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
      style={{ backgroundColor: 'var(--wt-card)', borderColor: 'var(--wt-border)' }}
    >
      <span className="text-2xl" aria-hidden="true">
        {icon}
      </span>
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--wt-navy)' }}>
          {label}
        </p>
        <p className="text-xs" style={{ color: 'var(--wt-text-muted)' }}>
          {description}
        </p>
      </div>
    </Link>
  );
}
