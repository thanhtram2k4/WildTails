---
name: thesis-evidence-capture
description: Captures reproducible technical evidence for the WildTails thesis, including commands, test results, metrics, screenshots, configurations, limitations, and links to relevant code.
user-invocable: true
---

Capture evidence for: `$ARGUMENTS`.

Create or update:

```text
docs/evidence/<topic>/
  overview.md
  commands.md
  test-results.md
  metrics.md
  limitations.md
  screenshots/
```

Evidence must include:

- date and commit;
- environment;
- exact command;
- input conditions;
- result;
- interpretation;
- limitation;
- code/file references.

Do not fabricate benchmark or evaluation results.
