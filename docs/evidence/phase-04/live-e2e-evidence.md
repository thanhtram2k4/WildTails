# Phase 04 Live E2E Evidence

## Test Suites

### cabin-goals.spec.ts (17 tests)

API-level E2E flow against running PostgreSQL, API, Web, Worker:

- Register User A, B, C
- Create PRIVATE journal, edit body, verify version history
- Create and assign tag, create folder and move journal
- Create goal and link journal, update progress
- Change visibility to SELECTED_USERS, grant User B
- User B reads shared journal (200)
- Revoke access, User B immediately denied (404)
- User C denied (404)
- Soft-delete journal, confirm 404 and absent from list
- Page-level screenshot captures (6 screenshots)

**Result**: 17/17 PASS

### cabin-detail-screenshots.spec.ts (10 tests)

Closure verification with real data and functional assertions:

- Create tag, folder, goal with 60% progress
- Create journal with rich Markdown, edit to create version
- **Assertion**: journal detail returns saved body with updated content
- **Assertion**: version history accessible, previous body snapshot preserved
- **Screenshot**: journal-detail.png captured with rendered Markdown
- **Assertion**: share grant, User B reads (200), revoke, User B denied (404)
- **Screenshot**: journal-sharing.png captured with SELECTED_USERS badge
- **Assertion**: goal detail returns progress=60, linkedJournalCount>=1
- **Screenshot**: goal-progress.png captured with 60% progress bar

**Result**: 10/10 PASS

### phase04-screenshots.spec.ts (10 tests)

Complete screenshot recapture with logged-in users and real data:

- All 9 required screenshots captured with real application state
- Uses login form authentication, creates journals/tags/folders/goals
- Empty state captured with a fresh user who has no data

**Result**: 10/10 PASS

## Functional Assertion Results

| Assertion                                                 | Result |
| --------------------------------------------------------- | ------ |
| Journal detail displays saved body                        | PASS   |
| Version history accessible and contains previous snapshot | PASS   |
| Owner sharing panel lists active recipient via API        | PASS   |
| User B can read while share is active (200)               | PASS   |
| User B immediately receives 404 after revoke              | PASS   |
| Goal detail displays stored progress (60%)                | PASS   |
| Linked journal count >= 1                                 | PASS   |

## Total E2E Tests: 37 (17 + 10 + 10)
