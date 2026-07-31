---
name: vertical-slice
description: Implements one WildTails feature end-to-end from acceptance criteria through contracts, backend, frontend, tests, privacy review, and evidence. Use for a small feature with a verifiable outcome.
disable-model-invocation: true
---

Implement the vertical slice: `$ARGUMENTS`.

Required order:

1. Restate acceptance criteria and out-of-scope.
2. Identify domain, data and privacy impact.
3. Freeze API/socket/schema contract.
4. Create failing tests for critical rules where practical.
5. Implement backend and data layer.
6. Implement frontend states.
7. Add negative authorization/failure tests.
8. Run quality gate.
9. Request independent review.
10. Update docs and evidence.

Do not expand scope without approval.
