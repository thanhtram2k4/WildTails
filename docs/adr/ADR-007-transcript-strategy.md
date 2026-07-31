# ADR-007: Transcript Acquisition Strategy

- Status: Accepted
- Date: 2026-07-31
- Decision owners: Human
- Related phase: 06

## Context

AI Auto-Log converts video/audio transcripts into structured journal entries. We need a way to acquire transcripts. Options range from manual paste to automated extraction from video platforms.

## Decision

Support both manual paste (mandatory fallback) and YouTube URL fetch (best-effort integration via adapter).

- **Manual paste**: user pastes transcript text directly. Always available as mandatory baseline.
- **YouTube URL fetch**: best-effort integration to extract transcript from YouTube video using a free library. Implemented through a `TranscriptAdapter` interface.
- **Adapter interface**: `TranscriptAdapter` so new sources can be added without changing business logic.
- **Validation**: transcript is treated as untrusted input; sanitized before LLM processing.

## Alternatives considered

### Manual paste only

Pro: simplest, no external dependency. Con: poor UX for thesis demo; users must find and copy transcripts manually.

### Paid transcription API (AssemblyAI, Whisper API)

Pro: supports audio/video files directly. Con: cost (budget is zero), complexity, not needed if transcripts are already available as text.

### Browser extension

Pro: seamless UX. Con: out of scope for MVP; additional codebase to maintain.

## Consequences

### Positive

- Manual paste ensures the feature always works regardless of external service availability.
- YouTube fetch provides good demo experience.
- Adapter pattern allows adding more sources later.

### Negative

- YouTube transcript extraction may break if YouTube changes their API/format.
- Must handle cases where video has no captions.

### Risks

- YouTube rate limiting or blocking (mitigated by mandatory manual paste fallback).
- Transcript quality varies (auto-generated captions may have errors; documented as limitation in thesis).

## Validation

- Manual paste creates an AI job successfully.
- YouTube URL fetch extracts transcript and creates AI job.
- Invalid URL returns clear error.
- Video without captions returns clear error with suggestion to use manual paste.
- Transcript with malicious content does not alter system prompt.
- Adapter can be swapped via configuration.

## Revisit trigger

- Need to support audio file upload (would need Whisper or similar; requires budget approval).
- YouTube extraction becomes unreliable.
