# WildTails – Claude Code Development System

This configuration set turns the **WildTails – Catalyst Verse** proposal into a controlled development workflow for Claude Code.

The goal is not to have Claude build the entire product autonomously in a single run. The goal is to help Claude:

- read the correct project context;
- split work into vertical slices;
- delegate to the right specialist agent;
- produce code with tests, documentation and evidence;
- stop at decisions that require human approval;
- never automatically deploy to production, edit secrets or destroy data.

## 1. Confirmed project architecture

- Monorepo: pnpm workspace.
- Frontend: Next.js App Router + TypeScript + Tailwind CSS.
- Backend: NestJS modular monolith.
- Worker: NestJS/BullMQ worker in TypeScript.
- Database: PostgreSQL + Prisma.
- Cache, queue and ephemeral game state: Redis.
- Real-time: Socket.IO.
- 2D interaction and mini-game: Phaser.
- Object storage: MinIO for local, S3-compatible for deploy.
- AI: LLM API via adapter.
- Testing: Jest/Vitest, Supertest, Playwright, k6 or Artillery.
- CI/CD: GitHub Actions.
- Observability: OpenTelemetry + Grafana.

## 2. How to place this configuration in the repository

Copy the entire contents of this directory into the root of the WildTails repository.

Minimum structure after copying:

```text
wildtails/
├── README.md
├── CLAUDE.md
├── PROJECT_STATUS.md
├── docs/
├── prompts/
├── scripts/
└── .claude/
    ├── settings.json
    ├── agents/
    └── skills/
```

## 3. Environment setup

Recommended requirements:

- Node.js 24 LTS.
- pnpm 11.
- Git.
- Docker Desktop or Docker Engine + Compose.
- Latest version of Claude Code.
- GitHub CLI if using the review/commit plugin.

Install Claude Code:

```bash
npm install -g @anthropic-ai/claude-code
claude doctor
```

Start in the repository:

```bash
cd wildtails
claude --agent wildtails-lead
```

If the agent does not appear, exit Claude Code and reopen it after the `.claude/agents/` directory exists.

## 4. Main working commands

Run phases in order:

```text
/run-phase 00
/run-phase 01
/run-phase 02
...
/run-phase 12
```

Each phase must end with:

1. generated source code or documentation;
2. related tests;
3. list of changed files;
4. evidence of verification commands;
5. remaining risks;
6. items requiring user approval;
7. update to `PROJECT_STATUS.md`.

Do not start the next phase until the current phase's acceptance gate passes.

## 5. Running the main agent

The main agent is `wildtails-lead`.

```bash
claude --agent wildtails-lead
```

This agent coordinates sub-agents:

- `solution-architect`
- `frontend-engineer`
- `backend-engineer`
- `database-security-engineer`
- `ai-pipeline-engineer`
- `realtime-game-engineer`
- `qa-security-reviewer`
- `devops-observability-engineer`

Do not use multiple agents to edit the same file simultaneously. The lead agent must partition ownership before delegating parallel work.

## 6. Safe vibe-coding principles

Claude is allowed to:

- create plans;
- create feature branches;
- edit source code within the phase scope;
- run lint, tests, typecheck and build;
- create local migrations;
- create technical documentation and ADRs;
- create fixtures, seeds and mocks;
- update `PROJECT_STATUS.md`.

Claude must not autonomously decide to:

- choose a paid LLM provider;
- purchase a service or create billing;
- enter real secrets;
- run migrations on production;
- delete a database or bucket;
- deploy to production;
- merge a pull request;
- change the MVP scope;
- make journal data public;
- use real user data for AI evaluation without consent.

The full list is in `docs/06-manual-work.md`.

## 7. Standard workflow for a feature

```text
Clarify requirement
→ inspect existing code
→ create implementation plan
→ define API/data contract
→ write or update tests
→ implement smallest vertical slice
→ run quality gate
→ security/privacy review
→ update docs and evidence
→ request human approval
```

Use skills:

```text
/vertical-slice <feature name>
/quality-gate
/privacy-first-api <endpoint or module>
/capture-evidence <item name>
```

## 8. Git rules

- One phase may contain many small commits.
- Do not commit secrets, `.env`, credentials or real user data.
- Do not force push.
- Do not use `git reset --hard` unless the user explicitly requests it.
- Each PR contains only one vertical slice or one group of changes with the same goal.
- PRs must have acceptance criteria, test evidence and screenshots when there is a UI.

## 9. Documents to read before coding

1. `CLAUDE.md`
2. `docs/00-project-brief.md`
3. `docs/01-technical-requirements.md`
4. `docs/02-architecture.md`
5. `docs/03-domain-rules.md`
6. `docs/04-security-and-privacy.md`
7. `docs/07-definition-of-done.md`
8. the corresponding phase in `prompts/phases/`

## 10. Expected outcomes

When P0 and P1 are complete, the repository must demonstrate:

- journals default to PRIVATE;
- cross-user journal access is impossible;
- AI Auto-Log runs via queue and creates drafts;
- users review before publishing;
- game is server-authoritative with reconnect;
- every point change has a transaction ledger entry;
- unit, integration, E2E, security and load tests exist;
- architecture, API, ERD, deployment and test evidence documentation exists.
