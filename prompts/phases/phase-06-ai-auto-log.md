# Phase 06 – AI Auto-Log

## Goal

Build a controlled asynchronous AI pipeline.

## Prompt

1. Transcript adapter interface.
2. Manual transcript fallback.
3. LLM adapter interface.
4. BullMQ queue/worker.
5. Job state machine.
6. Idempotency key.
7. Chunk/merge strategy.
8. Structured output schema.
9. Prompt versioning.
10. Draft persistence.
11. Job polling or notification.
12. Human edit before publish.
13. Retry/backoff.
14. Mock tests for timeout, bad JSON, duplicate job and worker restart.
15. Metrics: latency, token, model, attempts.
16. Do not call a paid real API in default tests.

## Manual gate

User selects provider, model, budget, quota and transcript method.
