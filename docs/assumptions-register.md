# Assumptions Register

Updated: 2026-07-31

| # | Assumption | Source | Impact if wrong | Validation method | Status |
|---|---|---|---|---|---|
| A01 | Space Dice is the MVP mini-game (not Spy Cat) | project-brief, CLAUDE.md | Game module scope changes significantly | Human decision D01 | ACCEPTED |
| A02 | MVP targets a single deployment environment (Docker Compose local) | technical-requirements | Infra complexity changes | Human decision D08 | ACCEPTED |
| A03 | No real LLM provider in Phases 01-05; mock adapter only; real provider approved before Phase 06 | CLAUDE.md AI rules, D04 | Must add real adapter before Phase 06 | Human decision D04/D05 | ACCEPTED |
| A04 | Transcript acquired via manual paste and YouTube URL fetch (best-effort) | domain-rules, D06 | Auto-Log usability reduced if only manual | Human decision D06 | ACCEPTED |
| A05 | Eight default planets are fixed for MVP; custom planets are P2 | CLAUDE.md priorities | Schema/UI scope changes | Confirmed in docs | ACCEPTED |
| A06 | PostgreSQL full-text search is sufficient for MVP; pgvector is P2 | technical-requirements | Search quality impact | Defer to P2 evaluation | ACCEPTED |
| A07 | Email uses mock service or Mailpit for local dev; real provider requires human approval | manual-work, D07 | Auth flow may need adjustment if email is added later | Human decision D07 | ACCEPTED |
| A08 | OAuth is NOT in MVP; social login moved to P2 | manual-work, D03 | No social login friction in MVP; email-password only | Human decision D03 | ACCEPTED |
| A09 | 4-6 players per Space Dice session | domain-rules | Game balance and load testing scope | Confirmed in docs | ACCEPTED |
| A10 | No Python/FastAPI service in MVP | CLAUDE.md constraints | If ML model needed, must add Python | Confirmed in docs | ACCEPTED |
| A11 | Modular monolith, not microservices, for MVP | CLAUDE.md constraints | Deployment and testing approach changes | Confirmed in docs | ACCEPTED |
| A12 | MinIO for local dev, S3-compatible for production | technical-requirements | Storage adapter scope | Confirmed in docs | ACCEPTED |
| A13 | AI output is always draft; no auto-publish | AI rules, domain-rules | Privacy and trust implications | Confirmed in docs | ACCEPTED |
| A14 | No real user data for testing; seed data only | testing-strategy | Test validity if using production patterns | Confirmed in docs | ACCEPTED |
| A15 | English is the project language for UI, docs, code, tests, and all artifacts | D12 | No internationalization needed in MVP | Human decision D12 | ACCEPTED |
| A16 | Target users are primarily Gen Z / students | project-brief | UX design, content, and locale choices | Confirmed in docs | ACCEPTED |
| A17 | This is a thesis/capstone project, not a commercial launch | project-brief, manual-work | Compliance and scale expectations differ | Confirmed in docs | ACCEPTED |
| A18 | Phaser is used for the game rendering layer | CLAUDE.md constraints | Frontend game integration approach | Confirmed in docs | ACCEPTED |
| A19 | AI evaluation uses only public videos and non-sensitive data; participants must consent; data must be anonymized; institutional requirements take priority | manual-work, D11 | Ethics and thesis compliance | Human decision D11 | ACCEPTED |
| A20 | LLM API budget is zero until Phase 06; provider, model, cost, quota, and fallback require human approval before any real API call | context, D05 | Cannot proceed to real AI integration without approval | Human decision D05 | ACCEPTED |
