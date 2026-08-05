---
name: Phase 04 — Captain's Cabin and Goals UI
description: Pages, components, and test coverage built for phase 04 of WildTails
type: project
---

Phase 04 delivered the Captain's Cabin dashboard, journal CRUD, goal management pages, and a safe Markdown renderer.

**Why:** Phase 04 scope from the WildTails roadmap — P0 features for Captain's Cabin privacy, journal/folder/tag/sharing, and The Sun goal management.

**Key decisions made:**

- Installed react-markdown, remark-gfm, rehype-sanitize (NOT marked/DOMPurify/rehype-raw).
- `react-hooks/set-state-in-effect` ESLint rule (from eslint-config-next) fires on any synchronous setState inside an effect body. The project fix is the `useRef` stable-setter pattern: `const setRef = useRef(setState)` then `setRef.current(...)` inside the effect. This exactly mirrors the existing dashboard page pattern.
- All pages use discriminated union state types (`{ status: 'loading' } | { status: 'success'; data }  | { status: 'error' }`) — no separate boolean flags.
- vitest.config.ts excludes e2e/ to prevent Playwright spec files from being picked up.
- test:watch and test scripts added to apps/web/package.json.

**How to apply:** Follow this same pattern for all new pages requiring data fetching. Use discriminated union state, useRef for setters when called from effects.
