# Phase 06 – AI Auto-Log

## Goal

Xây pipeline AI bất đồng bộ có kiểm soát.

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
11. Job polling hoặc notification.
12. Human edit trước publish.
13. Retry/backoff.
14. Mock tests cho timeout, bad JSON, duplicate job và worker restart.
15. Metrics: latency, token, model, attempts.
16. Không gọi API trả phí thật cho test mặc định.

## Manual gate

Người dùng chọn provider, model, budget, quota và transcript method.
