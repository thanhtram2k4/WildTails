---
name: quality-gate
description: Runs the WildTails completion gate for the current change: lint, typecheck, tests, build, migration validation, security/privacy checks, documentation, and evidence.
disable-model-invocation: true
---

Run the strongest available checks without inventing success:

1. `git diff --check`
2. lint
3. typecheck
4. unit tests
5. integration tests
6. build
7. migration/schema validation if changed
8. E2E or browser verification if UI changed
9. negative authorization/security tests if sensitive
10. inspect logs for secrets/private data
11. verify docs and status updates

Report each command, exit result and any skipped check with reason. A skipped critical check means the gate does not pass.
