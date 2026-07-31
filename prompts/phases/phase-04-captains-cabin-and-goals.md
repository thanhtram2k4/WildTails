# Phase 04 – Captain’s Cabin and The Sun

## Goal

Hoàn thiện private journaling vertical slice.

## Prompt

1. Journal folder, entry, version, tag.
2. PRIVATE mặc định.
3. SELECTED_USERS sharing với expiry/revoke.
4. Goal và progress.
5. Link journal với goal.
6. Editor UI.
7. Folder/list/search basic.
8. Cross-account denial tests.
9. Revoke immediate test.
10. Audit share/permission change.
11. Signed media upload skeleton nếu trong scope.
12. Browser evidence bằng hai tài khoản.

## Critical gate

Không pass nếu User B đọc được private journal của User A qua API, search, cache hoặc media.
