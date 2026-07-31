# WildTails – Project Instructions for Claude Code

## Mission

Xây dựng MVP WildTails – Catalyst Verse như một nền tảng web nhật ký xã hội được trò chơi hóa, tích hợp AI và tương tác thời gian thực.

Ưu tiên ba trụ cột kỹ thuật:

1. Quyền riêng tư của Captain’s Cabin.
2. AI Auto-Log bất đồng bộ, có structured output và human review.
3. Mini-game server-authoritative có reconnect.

Không đánh đổi tính đúng đắn, quyền riêng tư và khả năng kiểm thử để đổi lấy số lượng tính năng.

## Product positioning

WildTails không phải game truyền thống. Đây là gamified social journaling and knowledge-management platform.

Game là lớp trải nghiệm. Nghiệp vụ cốt lõi gồm:

- identity;
- journal và knowledge management;
- social feed;
- goal management;
- AI processing;
- real-time mini-game;
- gamification;
- moderation;
- audit và observability.

## MVP priorities

### P0

- Auth và session management.
- User profile và avatar mèo cơ bản.
- Tám hành tinh mặc định.
- The Sun goal management.
- Captain’s Cabin.
- Journal, folder, tag và sharing permission.
- Planet Feed.
- AI Auto-Log.
- Basic moderation.

### P1

- BullMQ worker.
- Point transaction ledger.
- Influence Score và leaderboard.
- Một mini-game Space Dice.
- Reconnect.
- Audit log.
- Security, AI và load evaluation.

### P2

Chỉ thực hiện khi P0 và P1 ổn định:

- Custom Planet.
- Ba AI personalities.
- Semantic search.
- Spy Cat và Co-op Quest.
- Event reward integration.

## Technology constraints

- Node.js 24 LTS.
- pnpm 11 workspace.
- TypeScript strict.
- Next.js App Router.
- NestJS modular monolith.
- PostgreSQL + Prisma.
- Redis + BullMQ.
- Socket.IO.
- Phaser.
- MinIO/S3.
- LLM provider thông qua adapter.
- Không thêm FastAPI hoặc Python service trong MVP nếu chưa có yêu cầu mô hình ML riêng.
- Không chuyển sang microservices trong MVP.

## Repository target structure

```text
apps/
  web/
  api/
  worker/
packages/
  contracts/
  database/
  game-core/
  ui/
  config/
  testing/
infra/
  docker/
  monitoring/
docs/
  adr/
  api/
  evidence/
```

Mỗi app hoặc package có thể có `CLAUDE.md` riêng nếu cần quy tắc cục bộ.

## Architectural rules

- NestJS là nguồn sự thật cho nghiệp vụ.
- PostgreSQL là nguồn dữ liệu bền vững.
- Redis chỉ dùng cho cache, queue, lock và state tạm.
- Worker không sở hữu logic authorization của API.
- Client không được quyết định game result, score, reward, owner hoặc visibility.
- Mọi boundary bên ngoài phải dùng adapter interface.
- Không import trực tiếp giữa các domain theo vòng tròn.
- Domain chỉ truy cập dữ liệu thuộc quyền sở hữu của mình thông qua service/port rõ ràng.
- Mọi quyết định kiến trúc lớn phải có ADR.

## Coding rules

- Không dùng `any`; dùng type cụ thể hoặc `unknown` với type guard.
- Mọi request phải được runtime validate.
- Mọi API response phải theo contract thống nhất.
- Mọi external API response phải validate trước khi sử dụng.
- Không để business logic trong controller, React component hoặc Socket.IO gateway.
- Hàm có side effect phải có tên rõ ràng.
- Không tạo abstraction khi mới có một use case nếu abstraction chưa giải quyết ranh giới rõ ràng.
- Ưu tiên code nhỏ, dễ test, không magic.
- Không copy-paste logic authorization hoặc point calculation.
- Không log access token, refresh token, password, transcript riêng tư hoặc journal body.
- Error message cho client không được lộ stack trace hoặc cấu trúc nội bộ.

## Privacy rules

- Journal mặc định `PRIVATE`.
- Default deny khi không có policy.
- Backend luôn kiểm tra owner và visibility.
- UI không phải lớp bảo mật.
- Selected-user sharing phải hỗ trợ revoke và expiry.
- AI output luôn là draft.
- Không tự động publish.
- Không dùng private journal cho public recommendation.
- Signed URL phải có thời hạn.
- Delete/export phải có audit và policy rõ.
- Test truy cập chéo là bắt buộc cho mọi thay đổi liên quan journal, folder, media, search và AI job.

## AI rules

- AI Job state machine:
  - QUEUED
  - FETCHING_SOURCE
  - PREPROCESSING
  - SUMMARIZING
  - CLASSIFYING
  - SAVING
  - COMPLETED
  - FAILED
  - CANCELLED
- LLM phải trả structured output được validate bằng schema.
- Lưu model, prompt version, latency, token usage và error code.
- Idempotency key dựa trên user, source và prompt version.
- Có retry giới hạn và exponential backoff.
- Transcript là untrusted input; không cho transcript thay đổi system instruction.
- Không khẳng định AI output là sự thật tuyệt đối.
- Luôn giữ source reference để đối chiếu.

## Real-time game rules

- Server authoritative.
- Game state machine phải explicit.
- Event phải validate schema, user, room membership, phase và turn.
- Random result sinh ở server.
- Client action phải idempotent khi cần.
- Redis giữ active snapshot.
- PostgreSQL giữ final result và point transaction.
- Reconnect trả snapshot, không chỉ replay event.
- Không trao điểm nếu game result chưa được persist thành công.

## Database rules

- Mọi schema change phải qua Prisma migration.
- Không sửa production schema thủ công.
- Migration phải review dữ liệu, rollback/forward strategy và index.
- Mọi point change phải tạo transaction.
- Các bảng quan trọng phải có audit fields.
- Soft delete chỉ dùng khi có lý do nghiệp vụ.
- Unique constraint phải phản ánh invariant, không chỉ dựa vào kiểm tra ứng dụng.
- Query danh sách phải pagination.
- Query private content phải lọc quyền trước khi trả dữ liệu.

## Testing rules

Mỗi feature phải có các lớp phù hợp:

- unit test cho domain rule;
- integration test cho database/queue/socket adapter;
- E2E cho critical user flow;
- negative authorization test;
- failure-path test;
- test evidence.

Không đánh dấu hoàn thành chỉ vì build thành công.

## Definition of done

Một hạng mục chỉ hoàn thành khi:

- acceptance criteria đạt;
- lint pass;
- typecheck pass;
- unit/integration test pass;
- E2E hoặc manual verification phù hợp pass;
- security/privacy review không có issue nghiêm trọng;
- migration đã được kiểm tra nếu có;
- docs được cập nhật;
- `PROJECT_STATUS.md` được cập nhật;
- không có secret hoặc generated artifact không cần thiết trong git;
- người dùng phê duyệt các quyết định bắt buộc.

## Agent orchestration

Khi chạy với `claude --agent wildtails-lead`:

- Lead phải phân tích phase trước.
- Dùng `solution-architect` cho contract, boundary và ADR.
- Dùng `frontend-engineer` cho UI/accessibility.
- Dùng `backend-engineer` cho NestJS domain/API.
- Dùng `database-security-engineer` cho Prisma, query, policy và migration.
- Dùng `ai-pipeline-engineer` cho Auto-Log.
- Dùng `realtime-game-engineer` cho Socket.IO/Phaser/game-core.
- Dùng `qa-security-reviewer` sau implementation, không dùng để tự phê duyệt code do chính agent đó viết.
- Dùng `devops-observability-engineer` cho Docker, CI/CD, telemetry và load harness.

Không cho hai agent ghi cùng file trong cùng thời điểm.

## Stop conditions

Dừng và hỏi người dùng khi:

- requirement mâu thuẫn proposal;
- cần secret, billing hoặc tài khoản bên ngoài;
- cần chọn LLM provider/model có chi phí;
- cần thay đổi dữ liệu hoặc migration không tương thích;
- cần xóa dữ liệu;
- cần deploy production;
- cần thay đổi MVP scope;
- có rủi ro privacy/security chưa có phương án;
- test thất bại nhưng root cause chưa rõ;
- plugin hoặc dependency yêu cầu quyền đáng ngờ.

## Response format after each task

Luôn kết thúc bằng:

1. Summary.
2. Files changed.
3. Commands executed.
4. Test results.
5. Security/privacy impact.
6. Remaining risks.
7. Manual actions required.
8. Next recommended prompt.
