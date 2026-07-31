# Agent Workflow

## Main agent

`wildtails-lead` chạy như main thread:

```bash
claude --agent wildtails-lead
```

Lead có nhiệm vụ:

- đọc phase;
- kiểm tra prerequisite;
- chia task;
- xác định file ownership;
- giao agent phụ;
- hợp nhất kết quả;
- chạy quality gate;
- yêu cầu human approval.

## Delegation matrix

| Task | Agent |
|---|---|
| Boundary, contract, ADR | solution-architect |
| Next.js, UI, accessibility | frontend-engineer |
| NestJS, use case, API | backend-engineer |
| Prisma, SQL, permission, migration | database-security-engineer |
| BullMQ, transcript, LLM | ai-pipeline-engineer |
| Socket.IO, Phaser, game-core | realtime-game-engineer |
| Test, abuse case, browser verify | qa-security-reviewer |
| Docker, CI/CD, telemetry | devops-observability-engineer |

## Parallel work rules

Được chạy song song khi:

- file ownership không giao nhau;
- contract đã freeze;
- database schema không thay đổi giữa chừng;
- lead đã ghi rõ input/output.

Không chạy song song khi:

- cùng sửa Prisma schema;
- cùng sửa shared contracts;
- cùng sửa root config;
- feature còn chưa có acceptance criteria;
- migration chưa được duyệt.

## Reviewer independence

Agent thực hiện không tự kết luận code của mình an toàn. Dùng `qa-security-reviewer` hoặc plugin review sau implementation.

## Memory

Agents dùng `memory: project` để lưu pattern, nhưng:

- memory không thay tài liệu chính thức;
- decision quan trọng phải đưa vào ADR;
- stale memory phải sửa hoặc xóa;
- không lưu secret/private data trong memory.
