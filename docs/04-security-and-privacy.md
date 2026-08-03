# Security and Privacy

## Security baseline

- Default deny.
- Least privilege.
- Server-side ownership check.
- Short-lived access token.
- Refresh token rotation/revocation.
- Password hashing using a standard library.
- Rate limit.
- Input validation.
- Output encoding.
- Parameterized database access.
- Secure headers.
- CORS allowlist.
- Audit log.
- Secrets must not be in the repository.

## Critical abuse cases

- IDOR journal.
- IDOR AI job.
- IDOR media.
- Moderator role bypass.
- Planet membership bypass.
- Duplicate vote.
- Fake dice result.
- Fake point request.
- File type spoofing.
- Refresh-token replay.
- Prompt injection via transcript.
- Search index leaking a private journal.
- Cache key missing user/policy context.

## Privacy requirements

- Journal default private.
- User-controlled sharing.
- Expiry and revoke.
- Data export.
- Account deletion flow.
- Retention policy.
- Consent for AI evaluation.
- Do not log journal body.
- Do not use private data for model training.
- Signed URL for private media.

## AI safety

- Transcript is treated as untrusted data.
- Prompt must separate instruction and source.
- Do not execute commands from transcript.
- Schema validation.
- Source reference.
- Human review.
- Clearly label AI-generated content.
- The companion does not represent a medical, legal or financial expert.

## Review gate

Every PR that touches auth, journal, media, search, AI, points or socket must include a security/privacy impact section.
