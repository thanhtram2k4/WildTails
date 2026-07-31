# Phase 00 – Project Audit and Human Decisions

## Goal

Chuyển proposal thành tập quyết định triển khai được, không code feature.

## Prompt

Bạn là WildTails lead. Hãy:

1. Đọc toàn bộ tài liệu dự án.
2. Lập assumption register.
3. Lập decision register.
4. Xác định P0, P1, P2.
5. Chốt hoặc yêu cầu người dùng chốt:
   - Space Dice là mini-game MVP;
   - auth strategy;
   - LLM provider;
   - transcript source/fallback;
   - email provider;
   - OAuth scope;
   - deployment target;
   - visual direction;
   - AI budget/quota;
   - data retention.
6. Tạo ADR proposed cho quyết định chưa chốt.
7. Tạo risk register.
8. Tạo acceptance map từ user story đến test.
9. Cập nhật PROJECT_STATUS.

## Deliverables

- `docs/decisions-register.md`
- `docs/assumptions-register.md`
- `docs/risk-register.md`
- `docs/acceptance-map.md`
- ADR proposed.
- Human decision checklist.

## Stop condition

Không bắt đầu Phase 01 cho đến khi stack, game MVP, auth direction và scope P0 được người dùng duyệt.
