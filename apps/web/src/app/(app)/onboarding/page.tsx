'use client';

import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  AvatarConfigSchema,
  DEFAULT_PLANET_SLUGS,
  type AvatarConfig,
  type PlanetResponse,
} from '@wildtails/contracts';
import { AvatarBuilder } from '@/components/avatar/avatar-builder';
import { AvatarPreview } from '@/components/avatar/avatar-preview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { useAuth } from '@/lib/auth/auth-context';
import { apiFetch } from '@/lib/api';

type Step = 'profile' | 'avatar' | 'planets';

const DEFAULT_AVATAR: AvatarConfig = {
  base: 'cat-round',
  fur: 'orange',
  eyes: 'round',
  outfit: 'none',
  accessory: 'none',
  background: 'none',
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

const PLANET_DESCRIPTIONS: Record<string, string> = {
  learning: 'Share knowledge, courses and study goals',
  sports: 'Fitness challenges, match results, personal bests',
  finance: 'Budgets, investments and financial journeys',
  work: 'Career milestones, projects and professional growth',
  travel: 'Adventures, itineraries and travel journals',
  health: 'Wellness routines, mental health and nutrition',
  pets: 'Animal companions, vet visits and cute moments',
  art: 'Creativity, projects and artistic expression',
};

const STEPS: Step[] = ['profile', 'avatar', 'planets'];
const STEP_LABELS: Record<Step, string> = {
  profile: 'Profile',
  avatar: 'Avatar',
  planets: 'Planets',
};

function Stepper({ current }: { current: Step }) {
  const currentIndex = STEPS.indexOf(current);
  return (
    <nav aria-label="Onboarding progress" className="mb-8">
      <ol className="flex items-center gap-0">
        {STEPS.map((step, i) => {
          const done = i < currentIndex;
          const active = step === current;
          return (
            <li key={step} className="flex flex-1 items-center">
              <span className="flex items-center gap-2">
                <span
                  className={[
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                    done
                      ? 'bg-amber-500 text-zinc-900'
                      : active
                        ? 'border-2 border-amber-500 text-amber-400'
                        : 'border-2 border-zinc-600 text-zinc-600',
                  ].join(' ')}
                  aria-current={active ? 'step' : undefined}
                >
                  {done ? (
                    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path
                        d="M13.5 3.5L6.5 11.5L2.5 7.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={[
                    'hidden text-xs font-medium sm:block',
                    active ? 'text-zinc-100' : 'text-zinc-500',
                  ].join(' ')}
                >
                  {STEP_LABELS[step]}
                </span>
              </span>
              {i < STEPS.length - 1 ? (
                <span
                  className={['mx-2 h-px flex-1', done ? 'bg-amber-500' : 'bg-zinc-700'].join(' ')}
                  aria-hidden="true"
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

async function fetchDefaultPlanets(): Promise<PlanetResponse[]> {
  const res = await apiFetch('/planets');
  if (!res.ok) throw new Error('Failed to load planets. Please retry.');
  const data = (await res.json()) as {
    success: boolean;
    data: PlanetResponse[];
  };
  if (!data.success) throw new Error('Failed to load planets.');
  const ordered = DEFAULT_PLANET_SLUGS.map((slug) => data.data.find((p) => p.slug === slug)).filter(
    (p): p is PlanetResponse => p !== undefined,
  );
  return ordered.length > 0 ? ordered : data.data;
}

export default function OnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>('profile');

  // Initialize displayName from auth user at construction — avoids a setState-in-effect.
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [bio, setBio] = useState('');
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(DEFAULT_AVATAR);
  const [selectedPlanets, setSelectedPlanets] = useState<Set<string>>(new Set());

  // Planet list state
  const [planets, setPlanets] = useState<PlanetResponse[]>([]);
  const [planetsLoading, setPlanetsLoading] = useState(false);
  const [planetsError, setPlanetsError] = useState<string | null>(null);
  const [planetsRetry, setPlanetsRetry] = useState(0);

  const [displayNameError, setDisplayNameError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Stable setter refs for use inside effect callbacks.
  const setPlanetsRef = useRef(setPlanets);
  const setPlanetsLoadingRef = useRef(setPlanetsLoading);
  const setPlanetsErrorRef = useRef(setPlanetsError);

  // Load planets when the planets step becomes visible.
  // All setState calls happen inside promise callbacks, not synchronously in the effect body.
  useEffect(() => {
    if (step !== 'planets' || planets.length > 0) return;
    let cancelled = false;
    setPlanetsLoadingRef.current(true);
    setPlanetsErrorRef.current(null);
    fetchDefaultPlanets().then(
      (data) => {
        if (!cancelled) {
          setPlanetsRef.current(data);
          setPlanetsLoadingRef.current(false);
        }
      },
      (err: unknown) => {
        if (!cancelled) {
          setPlanetsErrorRef.current(
            err instanceof Error ? err.message : 'A network error occurred.',
          );
          setPlanetsLoadingRef.current(false);
        }
      },
    );
    return () => {
      cancelled = true;
    };
    // planetsRetry is included so the effect reruns on explicit retry.
  }, [step, planets.length, planetsRetry]);

  function handleProfileNext(e: FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) {
      setDisplayNameError('Display name is required');
      return;
    }
    if (displayName.trim().length > 50) {
      setDisplayNameError('Display name must be 50 characters or fewer');
      return;
    }
    setDisplayNameError(undefined);
    setStep('avatar');
  }

  function handleAvatarNext() {
    setStep('planets');
  }

  function togglePlanet(id: string) {
    setSelectedPlanets((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleFinish() {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const avatarParsed = AvatarConfigSchema.safeParse(avatarConfig);
      if (!avatarParsed.success) {
        setSubmitError('Avatar configuration is invalid. Please review your choices.');
        return;
      }

      const profileRes = await apiFetch('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          displayName: displayName.trim() || undefined,
          bio: bio.trim() || undefined,
          avatarConfig: avatarParsed.data,
        }),
      });

      if (!profileRes.ok) {
        setSubmitError('Failed to save your profile. Please try again.');
        return;
      }

      // Join selected planets; non-fatal on partial failure.
      const joinResults = await Promise.allSettled(
        Array.from(selectedPlanets).map((planetId) =>
          apiFetch(`/planets/${planetId}/join`, { method: 'POST' }),
        ),
      );
      const failCount = joinResults.filter((r) => r.status === 'rejected').length;
      if (failCount > 0) {
        console.warn(`${failCount} planet join(s) failed silently`);
      }

      router.replace('/dashboard');
    } catch {
      setSubmitError('A network error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold text-zinc-100">Set up your profile</h1>
      <p className="mb-8 text-sm text-zinc-400">
        Step {STEPS.indexOf(step) + 1} of {STEPS.length}
      </p>

      <Stepper current={step} />

      {/* Step: Profile */}
      {step === 'profile' ? (
        <form onSubmit={handleProfileNext} noValidate className="flex flex-col gap-6">
          <h2 className="text-lg font-semibold text-zinc-200">Your profile</h2>

          <FormField
            id="ob-displayName"
            label="Display name"
            error={displayNameError}
            required
            hint="How other explorers will see you."
          >
            <Input
              id="ob-displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              hasError={Boolean(displayNameError)}
              disabled={isSubmitting}
              maxLength={50}
              placeholder="StargazerFelicia"
            />
          </FormField>

          <FormField id="ob-bio" label="Bio" hint="Optional. Up to 500 characters.">
            <textarea
              id="ob-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              disabled={isSubmitting}
              maxLength={500}
              rows={3}
              placeholder="Tell the universe about yourself..."
              className="block w-full resize-none rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 transition-colors focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
              aria-describedby="ob-bio-hint"
            />
            <p className="mt-1 text-right text-xs text-zinc-600">{bio.length}/500</p>
          </FormField>

          <div className="flex justify-end">
            <Button type="submit" size="lg">
              Next: Build your avatar
            </Button>
          </div>
        </form>
      ) : null}

      {/* Step: Avatar */}
      {step === 'avatar' ? (
        <div className="flex flex-col gap-6">
          <h2 className="text-lg font-semibold text-zinc-200">Build your avatar</h2>

          <div className="flex flex-col gap-6 sm:flex-row">
            {/* Preview */}
            <div className="flex flex-col items-center gap-3 sm:sticky sm:top-4 sm:self-start">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Preview
              </p>
              <AvatarPreview config={avatarConfig} size={120} />
              <p className="text-center text-xs text-zinc-500">
                Placeholder art — design approval pending
              </p>
            </div>

            {/* Builder */}
            <div className="flex-1">
              <AvatarBuilder value={avatarConfig} onChange={setAvatarConfig} />
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep('profile')} disabled={isSubmitting}>
              Back
            </Button>
            <Button size="lg" onClick={handleAvatarNext}>
              Next: Choose planets
            </Button>
          </div>
        </div>
      ) : null}

      {/* Step: Planets */}
      {step === 'planets' ? (
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-lg font-semibold text-zinc-200">Choose your planets</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Select the planets you want to join. You can change this later.
              {selectedPlanets.size > 0 ? (
                <span className="ml-1 text-amber-400">{selectedPlanets.size} selected</span>
              ) : null}
            </p>
          </div>

          {submitError ? (
            <div
              role="alert"
              className="rounded-lg border border-red-700 bg-red-900/30 px-4 py-3 text-sm text-red-300"
            >
              {submitError}
            </div>
          ) : null}

          {planetsLoading ? (
            <div
              className="flex items-center justify-center py-12"
              role="status"
              aria-label="Loading planets"
            >
              <span
                className="motion-safe:animate-spin h-8 w-8 rounded-full border-4 border-zinc-600 border-t-amber-500"
                aria-hidden="true"
              />
            </div>
          ) : planetsError ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-sm text-red-400">{planetsError}</p>
              <Button variant="secondary" size="sm" onClick={() => setPlanetsRetry((n) => n + 1)}>
                Retry
              </Button>
            </div>
          ) : (
            <div
              className="grid grid-cols-1 gap-3 sm:grid-cols-2"
              role="group"
              aria-label="Select planets"
            >
              {planets.length === 0
                ? // Fallback: static list when planets API is unavailable.
                  DEFAULT_PLANET_SLUGS.map((slug) => <StaticPlanetCard key={slug} slug={slug} />)
                : planets.map((planet) => (
                    <PlanetCard
                      key={planet.id}
                      planet={planet}
                      selected={selectedPlanets.has(planet.id)}
                      onToggle={() => togglePlanet(planet.id)}
                    />
                  ))}
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep('avatar')} disabled={isSubmitting}>
              Back
            </Button>
            <Button size="lg" onClick={() => void handleFinish()} isLoading={isSubmitting}>
              {selectedPlanets.size === 0 ? 'Skip for now' : 'Finish setup'}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PlanetCard({
  planet,
  selected,
  onToggle,
}: {
  planet: PlanetResponse;
  selected: boolean;
  onToggle: () => void;
}) {
  const icon = PLANET_ICONS[planet.slug] ?? '';
  const description = PLANET_DESCRIPTIONS[planet.slug] ?? planet.description ?? '';

  return (
    <label
      className={[
        'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors',
        'focus-within:ring-2 focus-within:ring-amber-500 focus-within:ring-offset-2 focus-within:ring-offset-zinc-900',
        selected ? 'border-amber-500 bg-amber-500/10' : 'border-zinc-700 hover:border-zinc-500',
      ].join(' ')}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggle}
        className="sr-only"
        aria-label={`Join ${planet.name} planet`}
      />
      <span className="text-2xl" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={[
            'font-semibold capitalize',
            selected ? 'text-amber-300' : 'text-zinc-200',
          ].join(' ')}
        >
          {planet.name}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">{description}</p>
        <p className="mt-1 text-xs text-zinc-600">{planet.memberCount.toLocaleString()} members</p>
      </div>
      <span
        className={[
          'mt-0.5 h-4 w-4 shrink-0 rounded border-2 transition-colors',
          selected ? 'border-amber-500 bg-amber-500' : 'border-zinc-600',
        ].join(' ')}
        aria-hidden="true"
      />
    </label>
  );
}

function StaticPlanetCard({ slug }: { slug: string }) {
  const icon = PLANET_ICONS[slug] ?? '';
  const description = PLANET_DESCRIPTIONS[slug] ?? '';
  const name = slug.charAt(0).toUpperCase() + slug.slice(1);

  return (
    <div className="flex items-start gap-3 rounded-xl border border-zinc-700 p-4 opacity-60">
      <span className="text-2xl" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold capitalize text-zinc-200">{name}</p>
        <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">{description}</p>
      </div>
    </div>
  );
}
