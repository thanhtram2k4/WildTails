# ADR-004: AI Provider Abstraction

- Status: Accepted (architecture); Provider selection deferred to Phase 06
- Date: 2026-07-31
- Decision owners: Human
- Related phase: 06

## Context

AI Auto-Log needs an LLM to summarize transcripts into structured journal drafts. The specific provider depends on budget, quality, and structured output support. We must be able to switch providers without rewriting business logic.

Per human decisions D04 and D05:
- Phases 01-05 use a mock LLM adapter only. No paid LLM service is connected or called.
- Budget is zero until Phase 06.
- Before Phase 06, the lead must present: proposed provider, model, estimated cost, usage quota, cost-control mechanism, and fallback strategy for human approval.

## Decision

Provider-independent adapter interface. Mock adapter for Phases 01-05. Real provider requires human approval before Phase 06.

```typescript
interface LlmAdapter {
  summarize(input: SummarizeInput): Promise<SummarizeOutput>;
  classify(input: ClassifyInput): Promise<ClassifyOutput>;
}
```

- Input/output types defined in `packages/contracts`.
- Adapter implementations in `apps/worker/src/adapters/`.
- Prompt templates versioned and stored with the adapter.
- Metrics (model, prompt version, latency, token usage, error code) recorded per call.
- Provider selected via environment variable.
- Mock adapter returns deterministic structured output for testing.

## Alternatives considered

### Direct SDK calls in business logic

Pro: less code initially. Con: vendor lock-in; cannot swap providers; untestable without real API calls.

### LangChain / Vercel AI SDK

Pro: multi-provider out of the box. Con: heavy dependency for MVP; abstraction may not match WildTails structured output needs; version churn.

### Custom adapter (chosen)

Pro: minimal, testable, thesis-friendly (shows design skill). Con: must write adapter per provider.

## Consequences

### Positive

- Provider-agnostic business logic.
- Easy to mock for testing.
- Prompt versioning enables thesis evaluation.
- Zero cost during development phases.

### Negative

- Each new provider needs a thin adapter implementation.
- Real provider integration delayed until Phase 06.

### Risks

- Structured output quality varies between providers (mitigated by schema validation on output).
- Mock adapter may not reveal real-world LLM issues (mitigated by testing with real provider in Phase 06).

## Validation

- Mock adapter passes all unit tests.
- Pipeline works end-to-end with mock adapter in Phases 01-05.
- Real adapter produces valid structured output (Phase 06).
- Switching provider via env var works without code changes.
- Metrics are recorded correctly.

## Revisit trigger

- Human approves real LLM provider before Phase 06.
- Need multiple providers simultaneously (e.g., fallback chain).
- Structured output format changes significantly.
