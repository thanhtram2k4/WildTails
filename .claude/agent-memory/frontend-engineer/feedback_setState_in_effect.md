---
name: setState in effect pattern
description: How to call setState inside useEffect without triggering the react-hooks/set-state-in-effect ESLint rule
type: feedback
---

Never call setState directly at the top of a useEffect body — the `react-hooks/set-state-in-effect` rule (from eslint-config-next) will error.

**Why:** The rule flags synchronous setState calls inside effects to avoid cascading renders. The existing codebase enforces this strictly.

**How to apply:** Wrap the setter in a useRef and access via `.current`:

```ts
const setRef = useRef(setState);

useEffect(() => {
  let cancelled = false;
  setRef.current({ status: 'loading' }); // OK — going through ref

  apiGet('/path').then(
    (env) => {
      if (!cancelled) setRef.current({ status: 'success', data: env.data });
    },
    (err) => {
      if (!cancelled) setRef.current({ status: 'error', message: '...' });
    },
  );
  return () => {
    cancelled = true;
  };
}, [deps]);
```

Alternatively, define an `async function load()` inside the effect and call setState only inside it (the linter treats calls inside an inner async function as non-synchronous).
