# WildTails – Claude Code Development System

Bộ cấu hình này biến proposal **WildTails – Catalyst Verse** thành một quy trình phát triển có kiểm soát dành cho Claude Code.

Mục tiêu của bộ cấu hình không phải là để Claude tự ý xây toàn bộ sản phẩm trong một lần chạy. Mục tiêu là giúp Claude:

- đọc đúng bối cảnh dự án;
- chia công việc theo từng vertical slice;
- giao việc cho đúng agent chuyên môn;
- tạo mã nguồn kèm test, tài liệu và bằng chứng;
- dừng lại tại những quyết định cần con người phê duyệt;
- không tự động triển khai production, sửa secret hoặc phá hủy dữ liệu.

## 1. Kiến trúc dự án được chốt

- Monorepo: pnpm workspace.
- Frontend: Next.js App Router + TypeScript + Tailwind CSS.
- Backend: NestJS modular monolith.
- Worker: NestJS/BullMQ worker bằng TypeScript.
- Database: PostgreSQL + Prisma.
- Cache, queue và game state tạm thời: Redis.
- Real-time: Socket.IO.
- 2D interaction và mini-game: Phaser.
- Object storage: MinIO khi local, S3-compatible khi deploy.
- AI: LLM API thông qua adapter.
- Testing: Jest/Vitest, Supertest, Playwright, k6 hoặc Artillery.
- CI/CD: GitHub Actions.
- Observability: OpenTelemetry + Grafana.

## 2. Cách đặt bộ cấu hình vào repository

Sao chép toàn bộ nội dung của thư mục này vào thư mục gốc của repository WildTails.

Cấu trúc tối thiểu sau khi sao chép:

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

## 3. Cài môi trường

Yêu cầu khuyến nghị:

- Node.js 24 LTS.
- pnpm 11.
- Git.
- Docker Desktop hoặc Docker Engine + Compose.
- Claude Code phiên bản mới nhất.
- GitHub CLI nếu sử dụng plugin review/commit.

Cài Claude Code:

```bash
npm install -g @anthropic-ai/claude-code
claude doctor
```

Khởi động trong repository:

```bash
cd wildtails
claude --agent wildtails-lead
```

Nếu agent chưa xuất hiện, thoát Claude Code và mở lại sau khi thư mục `.claude/agents/` đã tồn tại.

## 4. Lệnh làm việc chính

Chạy phase theo thứ tự:

```text
/run-phase 00
/run-phase 01
/run-phase 02
...
/run-phase 12
```

Mỗi phase phải kết thúc bằng:

1. mã nguồn hoặc tài liệu đã tạo;
2. test liên quan;
3. danh sách file thay đổi;
4. bằng chứng lệnh kiểm tra;
5. rủi ro còn lại;
6. mục cần người dùng phê duyệt;
7. cập nhật `PROJECT_STATUS.md`.

Không được bắt đầu phase tiếp theo khi acceptance gate của phase hiện tại chưa đạt.

## 5. Chạy agent chính

Agent chính là `wildtails-lead`.

```bash
claude --agent wildtails-lead
```

Agent này điều phối các agent phụ:

- `solution-architect`
- `frontend-engineer`
- `backend-engineer`
- `database-security-engineer`
- `ai-pipeline-engineer`
- `realtime-game-engineer`
- `qa-security-reviewer`
- `devops-observability-engineer`

Không dùng đồng thời nhiều agent để sửa cùng một file. Agent lead phải phân vùng ownership trước khi giao việc song song.

## 6. Nguyên tắc vibe coding an toàn

Claude được phép:

- tạo plan;
- tạo nhánh feature;
- sửa mã nguồn trong phạm vi phase;
- chạy lint, test, typecheck và build;
- tạo migration ở local;
- tạo tài liệu kỹ thuật và ADR;
- tạo fixture, seed và mock;
- cập nhật `PROJECT_STATUS.md`.

Claude không được tự quyết định:

- chọn nhà cung cấp LLM trả phí;
- mua dịch vụ hoặc tạo billing;
- nhập secret thật;
- chạy migration trên production;
- xóa database hoặc bucket;
- deploy production;
- merge pull request;
- thay đổi phạm vi MVP;
- công khai dữ liệu nhật ký;
- dùng dữ liệu người thật cho AI evaluation khi chưa có consent.

Danh sách đầy đủ nằm trong `docs/06-manual-work.md`.

## 7. Workflow tiêu chuẩn cho một feature

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

Dùng skill:

```text
/vertical-slice <tên feature>
/quality-gate
/privacy-first-api <endpoint hoặc module>
/capture-evidence <tên hạng mục>
```

## 8. Quy tắc Git

- Một phase có thể gồm nhiều commit nhỏ.
- Không commit secret, `.env`, credential hoặc dữ liệu người dùng thật.
- Không force push.
- Không dùng `git reset --hard` nếu chưa được người dùng yêu cầu rõ ràng.
- Mỗi PR chỉ chứa một vertical slice hoặc một nhóm thay đổi có cùng mục tiêu.
- PR phải có acceptance criteria, test evidence và screenshot khi có giao diện.

## 9. Tài liệu nên đọc trước khi code

1. `CLAUDE.md`
2. `docs/00-project-brief.md`
3. `docs/01-technical-requirements.md`
4. `docs/02-architecture.md`
5. `docs/03-domain-rules.md`
6. `docs/04-security-and-privacy.md`
7. `docs/07-definition-of-done.md`
8. phase tương ứng trong `prompts/phases/`

## 10. Kết quả mong đợi

Khi hoàn thành P0 và P1, repository phải chứng minh được:

- journal mặc định PRIVATE;
- không thể truy cập chéo journal;
- AI Auto-Log chạy bằng queue và tạo draft;
- người dùng duyệt trước khi publish;
- game server-authoritative và có reconnect;
- mọi thay đổi điểm có transaction ledger;
- có unit, integration, E2E, security và load test;
- có tài liệu kiến trúc, API, ERD, deployment và test evidence.
