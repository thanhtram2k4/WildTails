# Security and Privacy

## Security baseline

- Default deny.
- Least privilege.
- Server-side ownership check.
- Short-lived access token.
- Refresh token rotation/revocation.
- Password hashing bằng thư viện chuẩn.
- Rate limit.
- Input validation.
- Output encoding.
- Parameterized database access.
- Secure headers.
- CORS allowlist.
- Audit log.
- Secret không nằm trong repository.

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
- Prompt injection trong transcript.
- Search index làm lộ private journal.
- Cache key không chứa user/policy context.

## Privacy requirements

- Journal default private.
- User-controlled sharing.
- Expiry và revoke.
- Data export.
- Account deletion flow.
- Retention policy.
- Consent cho AI evaluation.
- Không log journal body.
- Không dùng dữ liệu private cho model training.
- Signed URL cho private media.

## AI safety

- Transcript được coi là untrusted data.
- Prompt phải tách instruction và source.
- Không thực thi lệnh từ transcript.
- Schema validation.
- Source reference.
- Human review.
- Label rõ nội dung AI-generated.
- Companion không đại diện chuyên gia y tế, pháp lý hoặc tài chính.

## Review gate

Mọi PR đụng đến auth, journal, media, search, AI, points hoặc socket phải có security/privacy impact section.
