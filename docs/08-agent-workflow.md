# Agent Workflow

## Main agent

`wildtails-lead` runs as the main thread:

```bash
claude --agent wildtails-lead
```

Lead responsibilities:

- read the phase;
- check prerequisites;
- split tasks;
- identify file ownership;
- delegate to sub-agents;
- merge results;
- run the quality gate;
- request human approval.

## Delegation matrix

| Task                               | Agent                         |
| ---------------------------------- | ----------------------------- |
| Boundary, contract, ADR            | solution-architect            |
| Next.js, UI, accessibility         | frontend-engineer             |
| NestJS, use case, API              | backend-engineer              |
| Prisma, SQL, permission, migration | database-security-engineer    |
| BullMQ, transcript, LLM            | ai-pipeline-engineer          |
| Socket.IO, Phaser, game-core       | realtime-game-engineer        |
| Test, abuse case, browser verify   | qa-security-reviewer          |
| Docker, CI/CD, telemetry           | devops-observability-engineer |

## Parallel work rules

Parallel execution is allowed when:

- file ownership does not overlap;
- contracts are frozen;
- the database schema is not changing mid-task;
- the lead has clearly recorded input/output.

Do not run in parallel when:

- editing the Prisma schema simultaneously;
- editing shared contracts simultaneously;
- editing root config simultaneously;
- a feature has no acceptance criteria yet;
- a migration has not been approved.

## Reviewer independence

The implementing agent must not conclude that its own code is safe. Use `qa-security-reviewer` or a review plugin after implementation.

## Memory

Agents use `memory: project` to store patterns, but:

- memory does not replace official documentation;
- important decisions must go into an ADR;
- stale memory must be corrected or deleted;
- do not store secrets or private data in memory.
