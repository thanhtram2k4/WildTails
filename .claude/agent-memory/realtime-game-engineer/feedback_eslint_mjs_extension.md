---
name: ESLint config file extension rule for non-module packages
description: Use .mjs for ESLint flat config when the package does not have "type":"module"
type: feedback
---

Packages without `"type": "module"` in their `package.json` must use `eslint.config.mjs` (not `eslint.config.js`) so Node treats it as ESM.

**Why:** The `@wildtails/config` package has `"type": "module"` and therefore uses `.js`. Sibling packages that lack that field must use `.mjs` or Node will parse the file as CommonJS and the ESM `import` syntax will fail.

**How to apply:** Whenever scaffolding a new `packages/*` entry, check for `"type": "module"` before choosing the ESLint config extension. If absent, always write `eslint.config.mjs`.
