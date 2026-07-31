---
name: ai-autolog-pipeline
description: Implements or reviews the WildTails AI Auto-Log pipeline using BullMQ, transcript adapters, structured LLM output, retries, idempotency, human review, and evaluation instrumentation.
user-invocable: true
---

Apply this pipeline:

1. Validate URL or manual transcript input.
2. Create idempotent job.
3. Persist QUEUED state.
4. Fetch source through adapter.
5. Normalize and chunk.
6. Isolate source from instructions.
7. Summarize/extract through LLM adapter.
8. Validate structured output.
9. Persist draft and source references.
10. Notify job owner.
11. Never auto-publish.
12. Record model, prompt version, tokens, latency, attempt and error.
13. Test timeout, malformed output, duplicate job and worker restart.
