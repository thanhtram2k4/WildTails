---
name: wildtails-frontend
description: Applies WildTails frontend conventions for Next.js, accessibility, visual identity, typed contracts, loading/error/offline states, privacy-safe rendering, and Phaser boundaries.
user-invocable: false
paths:
  - 'apps/web/**'
  - 'packages/ui/**'
---

Frontend rules:

- Use accessible semantic elements.
- Support keyboard use.
- Respect reduced motion.
- Keep WildTails visual identity intentional.
- Do not display private content before authorization result.
- Do not persist secrets in browser storage.
- Use typed schemas at API boundaries.
- Handle loading, empty, error, retry, unauthorized and offline.
- Keep Phaser isolated from React state through a defined bridge.
- Add screenshot/E2E evidence for key flows.
