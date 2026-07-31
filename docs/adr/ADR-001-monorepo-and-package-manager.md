# ADR-001: Monorepo and Package Manager

- Status: Accepted
- Date: 2026-07-31
- Decision owners: Human
- Related phase: 01

## Context

WildTails has three apps (web, api, worker) and shared packages (contracts, database, game-core, ui, config, testing). We need a monorepo strategy that supports TypeScript strict, shared dependencies, and fast builds.

## Decision

Use pnpm 11 workspace. Turborepo is optional; add only if build orchestration becomes a bottleneck.

## Alternatives considered

### npm workspaces

Pro: no extra tooling. Con: slower installs, no strict dependency isolation, phantom dependencies possible.

### yarn berry (PnP)

Pro: fast, zero-install option. Con: PnP compatibility issues with some tools (Prisma, native modules), steeper learning curve.

### pnpm + Nx

Pro: powerful task graph. Con: heavier setup, overkill for a thesis MVP with one developer.

## Consequences

### Positive

- Strict dependency isolation prevents phantom imports.
- Fast installs via content-addressable store.
- Simple workspace protocol for internal packages.

### Negative

- Some tools need pnpm-specific configuration (e.g., shamefully-hoist for certain native modules).

### Risks

- If a dependency is incompatible with pnpm strict mode, may need to add to .npmrc overrides.

## Validation

- `pnpm install` succeeds.
- Internal packages resolve via `workspace:*`.
- TypeScript project references work across packages.

## Revisit trigger

- Build times exceed 2 minutes for incremental builds.
- Need for remote caching (consider Turborepo or Nx at that point).
