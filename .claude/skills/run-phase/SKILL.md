---
name: run-phase
description: Runs one WildTails development phase by reading its phase prompt, validating prerequisites, delegating specialist work, enforcing quality gates, and requesting human approval. Invoke manually with a two-digit phase number.
disable-model-invocation: true
arguments:
  - phase
---

Run WildTails phase `$phase`.

1. Read `prompts/phases/phase-$phase-*.md`.
2. Read `CLAUDE.md`, `PROJECT_STATUS.md`, and referenced docs.
3. Verify previous phase approval.
4. Present a concise execution plan and file ownership map.
5. Stop for clarification if prerequisites are missing.
6. Execute only the current phase.
7. Delegate to appropriate agents.
8. Run `/quality-gate`.
9. Run independent QA/security review.
10. Save evidence under `docs/evidence/phase-$phase/`.
11. Update `PROJECT_STATUS.md`.
12. Request human approval before the next phase.
