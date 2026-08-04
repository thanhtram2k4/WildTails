# ADR-004: AI Provider Abstraction

- Status: Accepted (architecture); Provider selection deferred to Phase 06
- Date: 2026-08-04
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

---

## Phase 02 Concrete Decisions

### AI job state machine

Defined in `packages/contracts/src/enums/ai-job-state.ts` as `AiJobStateSchema` and mirrored as `AiJobState` in the Prisma schema.

```
QUEUED
  │
  ▼
FETCHING_SOURCE
  │
  ▼
PREPROCESSING
  │
  ▼
SUMMARIZING
  │
  ▼
CLASSIFYING
  │
  ▼
SAVING
  │
  ▼
COMPLETED ─── terminal
  │
FAILED    ─── terminal (set on any unrecoverable error in any state)
  │
CANCELLED ─── terminal (set by user request or policy)
```

Every state transition must:

1. Create an `AiJobStep` row with `startedAt` and optionally `completedAt`.
2. Update `AiJob.state` and `AiJob.updatedAt` in the same database transaction as the step insert.
3. Record the error code in `AiJob.errorCode` and `AiJobStep.errorMessage` on failure. Do not expose internal error details to the client.

### Structured output schema

Defined in `packages/contracts/src/ai/ai-output.ts` as `AiStructuredOutputSchema`. Every LLM response must be parsed and validated against this schema before being written to `AiOutput`. Validation failure sets the job to `FAILED` with error code `INVALID_OUTPUT_SCHEMA`.

| Field         | Type                | Constraint       | Notes                                     |
| ------------- | ------------------- | ---------------- | ----------------------------------------- |
| `title`       | string              | 1–255 characters | AI-suggested title for the journal draft. |
| `summary`     | string              | min 1 character  | AI-generated summary. Always a draft.     |
| `keyPoints`   | string[]            | 1–20 items       | Extracted key points.                     |
| `tags`        | string[]            | 1–10 items       | Suggested tags. User must review.         |
| `category`    | string (optional)   | —                | Broad topic category.                     |
| `actionItems` | string[] (optional) | max 20 items     | Suggested action items.                   |

AI output is always a draft (`AiOutput.journalId` is null until the user explicitly accepts and creates a journal from it). No automatic publishing. This invariant is enforced by the service layer, not the database default.

### Idempotency key derivation

The `AiJob.idempotencyKey` column (unique constraint) prevents duplicate jobs for the same logical input:

```
idempotencyKey = SHA-256(
  userId
  + "|"
  + (sourceUrl ?? SHA-256(manualTranscript))
  + "|"
  + promptVersion
)
```

If a job with the same key already exists and is in a non-terminal state, return the existing job. If the existing job is in `FAILED` or `CANCELLED`, allow a new job to be created (key collision should be treated as a retry).

### Prisma models

All AI domain models are in `packages/database/prisma/schema.prisma`:

| Model       | Table          | Purpose                                                           |
| ----------- | -------------- | ----------------------------------------------------------------- |
| `AiJob`     | `ai_jobs`      | One row per pipeline job. Holds state, metrics, idempotency key.  |
| `AiJobStep` | `ai_job_steps` | One row per state transition. Step-level audit trail.             |
| `AiOutput`  | `ai_outputs`   | Structured output after successful `COMPLETED` state. Draft only. |

Key fields on `AiJob`:

| Field            | Purpose                                                                |
| ---------------- | ---------------------------------------------------------------------- |
| `ownerId`        | Only this user may view job status and output.                         |
| `idempotencyKey` | Unique. Prevents duplicate jobs (see derivation above).                |
| `promptVersion`  | Pinned at job creation. Enables reproducibility for thesis evaluation. |
| `modelName`      | Recorded by the adapter after each call.                               |
| `tokenUsage`     | Total tokens consumed. Recorded for cost tracking in Phase 06.         |
| `latencyMs`      | End-to-end adapter latency. Recorded per call.                         |
| `errorCode`      | Structured error code. Safe to return to the client.                   |
| `errorMessage`   | Internal detail. Must never be exposed to the client.                  |

### Auth contracts in `@wildtails/contracts`

Defined in `packages/contracts/src/ai/ai-job.ts`:

| Contract             | Description                                                                     |
| -------------------- | ------------------------------------------------------------------------------- |
| `CreateAiJobRequest` | `{ sourceUrl?, manualTranscript?, promptVersion? }`. Mutually exclusive inputs. |
| `AiJobResponse`      | Full job record. Only the owner may receive `summary` and `tags`.               |
| `AiJobStepResponse`  | One step record: `{ state, startedAt, completedAt?, error? }`.                  |

The `AiJobResponse.summary` and `AiJobResponse.tags` fields must be omitted if the requesting principal is not the job owner. This check is enforced in the service layer, not the controller.

### Mock adapter requirement through Phase 05

Per human decision D04, no real LLM provider is connected before Phase 06. The mock adapter in `apps/worker/src/adapters/mock-llm.adapter.ts` must:

- Return a deterministic `AiStructuredOutput` for any input (fixed seed or input-hash-based).
- Record plausible `modelName`, `tokenUsage`, and `latencyMs` values to exercise the metrics path.
- Complete the full state machine (QUEUED → ... → COMPLETED) with all step rows written.

The real adapter is a stop condition: do not implement it until the human approves the provider, model, cost estimate, and fallback strategy.

### Prompt injection mitigation

`manualTranscript` is untrusted user input. The adapter must:

- Wrap the transcript in a clearly delimited user-content block in the system prompt.
- Never allow transcript content to appear outside that block.
- Validate that the LLM response does not reference system instruction contents.

The system prompt template is versioned alongside the adapter code. Changing the template increments `promptVersion`.

### Observability per call

Every adapter call must emit a structured log entry (not to stdout in production) containing:

```json
{
  "jobId": "...",
  "state": "SUMMARIZING",
  "modelName": "...",
  "promptVersion": "...",
  "latencyMs": 0,
  "tokenUsage": 0,
  "errorCode": null
}
```

Do not log `manualTranscript`, `summary`, `keyPoints`, or any other AI-generated content containing user-identifiable information.
