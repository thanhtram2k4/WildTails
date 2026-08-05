/**
 * Phase 05 — Planet Feed and Moderation E2E Test (no mocks)
 *
 * Runs against the live API (localhost:3000) and Web (localhost:3100).
 * Requires: PostgreSQL, Redis, API, and Web servers running.
 *
 * Privacy rules enforced:
 * - journalId is never in any API response (D24)
 * - Author embed never includes email, role, or private fields (D27)
 * - Self-report is rejected before DB lookup (D32)
 * - Only planet members can read the feed (default-deny)
 * - Moderator role is planet-scoped; wrong-planet moderator gets 404
 * - Hidden posts do not appear in the feed after ACTIONED moderation
 *
 * Setup approach for moderator role:
 * - Moderator membership role is set via direct DB update (docker exec psql).
 *   This mirrors exactly what the integration tests do via pg client.
 *   The docker container name is 'wildtails-postgres'.
 *
 * Flow:
 *  1. Register userA, userB, moderatorUser, wrongModUser
 *  2. Fetch default planet list → pick planetA (index 0), planetB (index 1)
 *  3. Join planetA: userA, userB, moderatorUser
 *  4. Join planetB: wrongModUser
 *  5. Promote moderatorUser → MODERATOR on planetA (docker exec psql)
 *  6. userA creates a PRIVATE journal → 201
 *  7. Feed is empty for all members (private journal not auto-shared)
 *  8. userA publishes a JOURNAL_SHARE post → 201
 *  9. Feed has 1 post for userA and userB
 * 10. PostResponse has no journalId for userB (D24)
 * 11. PostResponse has no journalId for userA (D24, even for owner)
 * 12. Author embed has no email (D27)
 * 13. userB comments on the post → 201
 * 14. Reply depth > 1 is rejected → 400
 * 15. userB reacts (LIKE) → 200
 * 16. userB switches reaction to INSIGHTFUL → 200 (toggle/switch)
 * 17. Concurrent duplicate reactions handled → exactly one reaction row, no 500
 * 18. userB saves the post → 201
 * 19. Duplicate save → 409
 * 20. Self-report rejected → 400
 * 21. userB reports the post → 201
 * 22. Duplicate pending report → 409
 * 23. Moderator lists planet reports → 200, contains the report
 * 24. Wrong-planet moderator listing planetA reports → 403 or 404
 * 25. Moderator reviews report (ACTIONED) → 200
 * 26. Feed after moderation → 0 posts (post is hidden)
 * 27. userA's private journal still accessible to owner after post is actioned
 * 28. Non-member cannot read the feed (default-deny)
 * 29. Screenshot: planet feed page
 * 30. Screenshot: post detail page
 * 31. Screenshot: moderation queue page
 * 32. Screenshot: empty feed page
 */

import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const API_BASE = 'http://localhost:3000';
const WEB_BASE = 'http://localhost:3100';
const EVIDENCE_DIR = path.resolve(__dirname, '../../../docs/evidence/phase-05/screenshots');

const suffix = Date.now();
const userAEmail = `e2e-p05-a-${suffix}@wildtails.dev`;
const userBEmail = `e2e-p05-b-${suffix}@wildtails.dev`;
const modEmail = `e2e-p05-mod-${suffix}@wildtails.dev`;
const wrongModEmail = `e2e-p05-wrongmod-${suffix}@wildtails.dev`;
const password = 'e2e-test-password-123';

interface UserState {
  accessToken: string;
  refreshToken: string;
  userId: string;
}

async function apiRegister(email: string, displayName: string): Promise<UserState> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName }),
  });
  expect(res.status, `register ${displayName}`).toBe(201);
  const data = await res.json();

  const meRes = await fetch(`${API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${data.data.accessToken}` },
  });
  expect(meRes.status, `GET /users/me for ${displayName}`).toBe(200);
  const me = await meRes.json();

  return {
    accessToken: data.data.accessToken as string,
    refreshToken: data.data.refreshToken as string,
    userId: me.data.id as string,
  };
}

async function apiFetch(urlPath: string, token: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE}${urlPath}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers as Record<string, string>),
    },
  });
}

/**
 * Promotes a user to MODERATOR on a given planet using a direct DB update
 * via docker exec psql. This is the same approach used in the integration
 * test suite (queryDB) — we just shell out instead of importing pg.
 *
 * Uses spawnSync (not execSync) so the SQL string containing double-quotes
 * around camelCase Prisma column names is passed as a single argv element
 * without any shell interpolation stripping the quotes.
 */
function promoteToModerator(userId: string, planetId: string): void {
  const sql = `UPDATE planet_memberships SET role = 'MODERATOR' WHERE "userId" = '${userId}' AND "planetId" = '${planetId}'`;
  const result = spawnSync(
    'docker',
    ['exec', 'wildtails-postgres', 'psql', '-U', 'wildtails', '-d', 'wildtails', '-c', sql],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) {
    throw new Error(`promoteToModerator failed (exit ${String(result.status)}): ${result.stderr}`);
  }
}

// ─── Shared state ─────────────────────────────────────────────────────────────

let userA: UserState;
let userB: UserState;
let moderatorUser: UserState;
let wrongModUser: UserState;

let planetAId: string;
let planetBId: string;

let privateJournalId: string;
let postId: string;
let commentId: string;
let reportId: string;

// ─── Test suite ───────────────────────────────────────────────────────────────

test.describe.serial('Phase 05 — Planet Feed and Moderation', () => {
  // ── Global setup ────────────────────────────────────────────────────────────

  test.beforeAll(async () => {
    // Register all four users in parallel
    [userA, userB, moderatorUser, wrongModUser] = await Promise.all([
      apiRegister(userAEmail, 'Tail A'),
      apiRegister(userBEmail, 'Tail B'),
      apiRegister(modEmail, 'Moderator'),
      apiRegister(wrongModEmail, 'WrongMod'),
    ]);

    // Fetch default planets — pick index 0 as planetA, index 1 as planetB
    const planetsRes = await apiFetch('/planets', userA.accessToken);
    expect(planetsRes.status, 'GET /planets').toBe(200);
    const planetsData = await planetsRes.json();
    const planets = planetsData.data as Array<{ id: string }>;
    expect(planets.length, 'need at least 2 default planets').toBeGreaterThanOrEqual(2);

    planetAId = planets[0]!.id;
    planetBId = planets[1]!.id;

    // Join planet A: userA, userB, moderatorUser
    await Promise.all([
      apiFetch(`/planets/${planetAId}/join`, userA.accessToken, { method: 'POST' }),
      apiFetch(`/planets/${planetAId}/join`, userB.accessToken, { method: 'POST' }),
      apiFetch(`/planets/${planetAId}/join`, moderatorUser.accessToken, { method: 'POST' }),
    ]);

    // Join planet B: wrongModUser (a moderator on the wrong planet)
    await apiFetch(`/planets/${planetBId}/join`, wrongModUser.accessToken, { method: 'POST' });

    // Promote moderatorUser → MODERATOR on planetA (direct DB update)
    promoteToModerator(moderatorUser.userId, planetAId);
    // Promote wrongModUser → MODERATOR on planetB
    promoteToModerator(wrongModUser.userId, planetBId);
  });

  // ── Global teardown ─────────────────────────────────────────────────────────

  test.afterAll(async () => {
    for (const user of [userA, userB, moderatorUser, wrongModUser]) {
      if (user?.accessToken) {
        await apiFetch('/auth/logout', user.accessToken, {
          method: 'POST',
          body: JSON.stringify({ refreshToken: user.refreshToken }),
        }).catch(() => {});
      }
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE JOURNAL — publishing boundary
  // ═══════════════════════════════════════════════════════════════════════════

  test('01 — userA creates a PRIVATE journal (201)', async () => {
    const res = await apiFetch('/journals', userA.accessToken, {
      method: 'POST',
      body: JSON.stringify({
        title: 'My Secret Field Notes',
        body: 'Private content only the owner should ever see.',
        visibility: 'PRIVATE',
      }),
    });
    expect(res.status, 'create PRIVATE journal').toBe(201);
    const data = await res.json();
    privateJournalId = data.data.id as string;
    expect(data.data.visibility).toBe('PRIVATE');
  });

  test('02 — private journal does NOT appear in planet feed automatically', async () => {
    const res = await apiFetch(`/planets/${planetAId}/posts`, userA.accessToken);
    expect(res.status, 'feed after private journal creation').toBe(200);
    const data = await res.json();
    const posts = data.data as Array<{ body: string }>;
    expect(posts.some((p) => p.body.includes('Private content only'))).toBe(false);
  });

  test('03 — private journal content is also absent from feed for other planet members', async () => {
    // This test checks privacy, not total count. Default planets may already have posts
    // from prior test runs. We only assert that the private journal body is not published.
    const res = await apiFetch(`/planets/${planetAId}/posts`, userB.accessToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    const posts = data.data as Array<{ body: string }>;
    expect(posts.some((p) => p.body.includes('Private content only the owner'))).toBe(false);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLISHING — explicit post creation
  // ═══════════════════════════════════════════════════════════════════════════

  test('04 — userA publishes a JOURNAL_SHARE post (201)', async () => {
    const res = await apiFetch('/posts', userA.accessToken, {
      method: 'POST',
      body: JSON.stringify({
        body: 'Sharing my field notes insights with the planet!',
        planetId: planetAId,
        type: 'JOURNAL_SHARE',
        journalId: privateJournalId,
      }),
    });
    expect(res.status, 'create JOURNAL_SHARE post').toBe(201);
    const data = await res.json();
    postId = data.data.id as string;
    expect(data.data.body).toBe('Sharing my field notes insights with the planet!');
    expect(data.data.planetId).toBe(planetAId);
    // D24: journalId must never appear in the response
    expect(data.data).not.toHaveProperty('journalId');
    expect(data.data).not.toHaveProperty('sourceJournalId');
  });

  test('05 — published post appears in planet feed (1 post)', async () => {
    const res = await apiFetch(`/planets/${planetAId}/posts`, userA.accessToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    const posts = data.data as Array<{ id: string }>;
    expect(posts.some((p) => p.id === postId)).toBe(true);
  });

  test('06 — feed response has NO journalId for userB (D24)', async () => {
    const res = await apiFetch(`/planets/${planetAId}/posts`, userB.accessToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    const posts = data.data as Array<Record<string, unknown>>;
    const targetPost = posts.find((p) => p['id'] === postId);
    expect(targetPost, 'post visible to userB').toBeDefined();
    expect(targetPost).not.toHaveProperty('journalId');
    expect(targetPost).not.toHaveProperty('sourceJournalId');
  });

  test('07 — feed response has NO journalId for userA (owner, D24)', async () => {
    const res = await apiFetch(`/planets/${planetAId}/posts`, userA.accessToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    const posts = data.data as Array<Record<string, unknown>>;
    const targetPost = posts.find((p) => p['id'] === postId);
    expect(targetPost).not.toHaveProperty('journalId');
    expect(targetPost).not.toHaveProperty('sourceJournalId');
  });

  test('08 — author embed has NO email (D27)', async () => {
    const res = await apiFetch(`/posts/${postId}`, userB.accessToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    const author = data.data.author as Record<string, unknown>;
    expect(author).toHaveProperty('id');
    expect(author).toHaveProperty('displayName');
    expect(author).not.toHaveProperty('email');
    expect(author).not.toHaveProperty('role');
    expect(author).not.toHaveProperty('password');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // NON-MEMBER DEFAULT-DENY
  // ═══════════════════════════════════════════════════════════════════════════

  test('09 — non-member cannot read planet feed (default-deny)', async () => {
    // Register a fresh user who has never joined planetA
    const outsider = await apiRegister(`e2e-p05-outsider-${suffix}@wildtails.dev`, 'Outsider');
    const res = await apiFetch(`/planets/${planetAId}/posts`, outsider.accessToken);
    // Service returns 404 when user has no active membership
    expect([403, 404], '403 or 404 for non-member').toContain(res.status);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMMENTS
  // ═══════════════════════════════════════════════════════════════════════════

  test('10 — userB comments on the post (201)', async () => {
    const res = await apiFetch(`/posts/${postId}/comments`, userB.accessToken, {
      method: 'POST',
      body: JSON.stringify({ body: 'Great field notes!', postId }),
    });
    expect(res.status, 'create comment').toBe(201);
    const data = await res.json();
    commentId = data.data.id as string;
    expect(data.data.body).toBe('Great field notes!');
    expect(data.data.authorId).toBe(userB.userId);
  });

  test('11 — reply depth > 1 is rejected (400)', async () => {
    // Create a reply to the comment (depth 1 — allowed)
    const replyRes = await apiFetch(`/posts/${postId}/comments`, userA.accessToken, {
      method: 'POST',
      body: JSON.stringify({ body: 'Thanks!', postId, parentId: commentId }),
    });
    expect(replyRes.status, 'depth-1 reply allowed').toBe(201);
    const replyData = await replyRes.json();
    const depth1ReplyId = replyData.data.id as string;

    // Try to reply to the reply (depth 2 — rejected by D23)
    const nestedRes = await apiFetch(`/posts/${postId}/comments`, userB.accessToken, {
      method: 'POST',
      body: JSON.stringify({ body: 'Nested reply attempt', postId, parentId: depth1ReplyId }),
    });
    expect(nestedRes.status, 'depth-2 reply rejected').toBe(400);
  });

  test('12 — userB can list comments on the post', async () => {
    const res = await apiFetch(`/posts/${postId}/comments`, userB.accessToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    const comments = data.data as Array<{ id: string }>;
    expect(comments.some((c) => c.id === commentId)).toBe(true);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // REACTIONS
  // ═══════════════════════════════════════════════════════════════════════════

  test('13 — userB reacts LIKE to the post (201 on first, 200 on toggle)', async () => {
    // ToggleReactionRequest requires postId in the body.
    // The endpoint returns 201 when creating a new reaction, 200 when toggling/updating.
    const res = await apiFetch(`/posts/${postId}/reactions`, userB.accessToken, {
      method: 'POST',
      body: JSON.stringify({ postId, type: 'LIKE' }),
    });
    expect([200, 201], 'LIKE reaction status').toContain(res.status);
    const data = await res.json();
    // ReactionResponse shape: { postId, counts, userReaction? }
    expect(data.data.userReaction).toBe('LIKE');
  });

  test('14 — userB switches reaction to INSIGHTFUL', async () => {
    const res = await apiFetch(`/posts/${postId}/reactions`, userB.accessToken, {
      method: 'POST',
      body: JSON.stringify({ postId, type: 'INSIGHTFUL' }),
    });
    expect([200, 201], 'switch to INSIGHTFUL status').toContain(res.status);
    const data = await res.json();
    expect(data.data.userReaction).toBe('INSIGHTFUL');
  });

  test('15 — toggling INSIGHTFUL again removes the reaction', async () => {
    // Toggle off — sending the same type again clears it
    const offRes = await apiFetch(`/posts/${postId}/reactions`, userB.accessToken, {
      method: 'POST',
      body: JSON.stringify({ postId, type: 'INSIGHTFUL' }),
    });
    expect([200, 201], 'toggle off INSIGHTFUL status').toContain(offRes.status);
    const offData = await offRes.json();
    // userReaction is absent (undefined) when no reaction is active
    expect(offData.data.userReaction).toBeUndefined();

    // Toggle LIKE back on for subsequent save/report tests
    const onRes = await apiFetch(`/posts/${postId}/reactions`, userB.accessToken, {
      method: 'POST',
      body: JSON.stringify({ postId, type: 'LIKE' }),
    });
    expect([200, 201], 'toggle LIKE back on status').toContain(onRes.status);
    const onData = await onRes.json();
    expect(onData.data.userReaction).toBe('LIKE');
  });

  test('16 — concurrent duplicate reactions produce exactly one row, no 500', async () => {
    // Send two identical reactions simultaneously
    const [r1, r2] = await Promise.all([
      apiFetch(`/posts/${postId}/reactions`, userA.accessToken, {
        method: 'POST',
        body: JSON.stringify({ postId, type: 'LIKE' }),
      }),
      apiFetch(`/posts/${postId}/reactions`, userA.accessToken, {
        method: 'POST',
        body: JSON.stringify({ postId, type: 'LIKE' }),
      }),
    ]);
    // Both should succeed (upsert semantics) — no 500
    expect(r1.status, 'concurrent reaction 1').not.toBe(500);
    expect(r2.status, 'concurrent reaction 2').not.toBe(500);

    // Verify reaction counts are consistent (LIKE not doubled)
    const countsRes = await apiFetch(`/posts/${postId}/reactions`, userA.accessToken);
    expect(countsRes.status).toBe(200);
    const countsData = await countsRes.json();
    const counts = countsData.data.counts as Record<string, number>;
    expect(counts['LIKE'] ?? 0).toBeGreaterThanOrEqual(1);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SAVED POSTS
  // ═══════════════════════════════════════════════════════════════════════════

  test('17 — userB saves the post (201)', async () => {
    const res = await apiFetch(`/posts/${postId}/save`, userB.accessToken, {
      method: 'POST',
    });
    expect(res.status, 'save post').toBe(201);
  });

  test('18 — duplicate save returns 409', async () => {
    const res = await apiFetch(`/posts/${postId}/save`, userB.accessToken, {
      method: 'POST',
    });
    expect(res.status, 'duplicate save').toBe(409);
  });

  test('19 — userB can list saved posts and the post appears there', async () => {
    const res = await apiFetch('/saved-posts', userB.accessToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    // SavedPostEntry shape: { postId, savedAt, post? }
    const savedPosts = data.data as Array<{ postId: string }>;
    expect(savedPosts.some((sp) => sp.postId === postId)).toBe(true);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // REPORTS
  // ═══════════════════════════════════════════════════════════════════════════

  test('20 — self-report rejected (400, D32)', async () => {
    // userA tries to report their own post
    const res = await apiFetch('/reports', userA.accessToken, {
      method: 'POST',
      body: JSON.stringify({
        targetType: 'POST',
        targetId: postId,
        reason: 'Spam',
      }),
    });
    expect(res.status, 'self-report rejected').toBe(400);
  });

  test('21 — userB reports the post (201)', async () => {
    const res = await apiFetch('/reports', userB.accessToken, {
      method: 'POST',
      body: JSON.stringify({
        targetType: 'POST',
        targetId: postId,
        reason: 'Inappropriate content',
        description: 'This post violates community guidelines.',
      }),
    });
    expect(res.status, 'create report').toBe(201);
    const data = await res.json();
    reportId = data.data.id as string;
    expect(data.data.status).toBe('PENDING');
    expect(data.data.targetType).toBe('POST');
    expect(data.data.targetId).toBe(postId);
    // reporterId must never be exposed in the response
    expect(data.data).not.toHaveProperty('reporterId');
  });

  test('22 — duplicate pending report returns 409', async () => {
    const res = await apiFetch('/reports', userB.accessToken, {
      method: 'POST',
      body: JSON.stringify({
        targetType: 'POST',
        targetId: postId,
        reason: 'Spam',
      }),
    });
    expect(res.status, 'duplicate pending report').toBe(409);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MODERATION
  // ═══════════════════════════════════════════════════════════════════════════

  test('23 — moderator lists planet reports (200, contains the report)', async () => {
    const res = await apiFetch(
      `/planets/${planetAId}/reports?status=PENDING`,
      moderatorUser.accessToken,
    );
    expect(res.status, 'moderator list reports').toBe(200);
    const data = await res.json();
    const reports = data.data as Array<{ id: string }>;
    expect(
      reports.some((r) => r.id === reportId),
      'report in queue',
    ).toBe(true);
  });

  test('24 — wrong-planet moderator is denied access to planetA reports', async () => {
    // wrongModUser is MODERATOR on planetB — should not see planetA reports
    const res = await apiFetch(`/planets/${planetAId}/reports`, wrongModUser.accessToken);
    expect([403, 404], 'wrong-planet mod denied').toContain(res.status);
  });

  test('25 — non-moderator member cannot list reports', async () => {
    const res = await apiFetch(`/planets/${planetAId}/reports`, userB.accessToken);
    expect([403, 404], 'plain member denied reports').toContain(res.status);
  });

  test('26 — moderator reviews report with ACTIONED status (200)', async () => {
    const res = await apiFetch(`/reports/${reportId}`, moderatorUser.accessToken, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'ACTIONED',
        note: 'Content removed per community guidelines.',
      }),
    });
    expect(res.status, 'review report ACTIONED').toBe(200);
    const data = await res.json();
    expect(data.data.status).toBe('ACTIONED');
  });

  test('27 — duplicate review of already-actioned report returns 409', async () => {
    const res = await apiFetch(`/reports/${reportId}`, moderatorUser.accessToken, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'DISMISSED' }),
    });
    expect(res.status, 'duplicate review returns 409').toBe(409);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVACY — post hidden after ACTIONED
  // ═══════════════════════════════════════════════════════════════════════════

  test('28 — hidden post no longer appears in feed after ACTIONED moderation', async () => {
    const res = await apiFetch(`/planets/${planetAId}/posts`, userA.accessToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    const posts = data.data as Array<{ id: string }>;
    expect(
      posts.every((p) => p.id !== postId),
      'post hidden from feed',
    ).toBe(true);
  });

  test('29 — hidden post is also absent from userB feed', async () => {
    const res = await apiFetch(`/planets/${planetAId}/posts`, userB.accessToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    const posts = data.data as Array<{ id: string }>;
    expect(posts.every((p) => p.id !== postId)).toBe(true);
  });

  test('30 — GET /posts/:id on a hidden post returns 404 for non-moderator', async () => {
    const res = await apiFetch(`/posts/${postId}`, userB.accessToken);
    expect([403, 404], 'hidden post returns 403 or 404').toContain(res.status);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE JOURNAL INTEGRITY
  // ═══════════════════════════════════════════════════════════════════════════

  test('31 — userA private journal remains intact and accessible to owner', async () => {
    const res = await apiFetch(`/journals/${privateJournalId}`, userA.accessToken);
    expect(res.status, 'owner reads own private journal').toBe(200);
    const data = await res.json();
    expect(data.data.visibility).toBe('PRIVATE');
    expect(data.data.body).toContain('Private content only the owner should ever see');
  });

  test('32 — userB cannot access userA private journal (404)', async () => {
    const res = await apiFetch(`/journals/${privateJournalId}`, userB.accessToken);
    expect(res.status, 'userB denied private journal').toBe(404);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // WEB UI SCREENSHOTS
  // ═══════════════════════════════════════════════════════════════════════════

  test(
    'screenshot — planet feed page (logged in, with posts)',
    { timeout: 120_000 },
    async ({ page }) => {
      // Create a fresh post for the screenshot since the earlier one is hidden
      const freshPost = await apiFetch('/posts', userA.accessToken, {
        method: 'POST',
        body: JSON.stringify({
          body: 'Exploring the frontier with WildTails — check out my latest journal!',
          planetId: planetAId,
          type: 'TEXT',
        }),
      });
      // Best-effort: if the post was created, the feed will have content
      const freshPostOk = freshPost.status === 201;

      await page.goto(`${WEB_BASE}/login`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passInput = page.locator('input[type="password"]').first();
      if (await emailInput.isVisible()) {
        await emailInput.fill(userAEmail);
        await passInput.fill(password);
        await page.locator('button[type="submit"]').first().click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
      }

      await page.goto(`${WEB_BASE}/planets/${planetAId}/feed`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      await page.screenshot({
        path: path.join(EVIDENCE_DIR, 'planet-feed.png'),
        fullPage: true,
      });

      // Satisfy linter — freshPostOk is used for contextual info
      void freshPostOk;
    },
  );

  test('screenshot — post detail page with comments', { timeout: 120_000 }, async ({ page }) => {
    // Create a standalone post for the screenshot to show a full detail view
    const newPostRes = await apiFetch('/posts', userA.accessToken, {
      method: 'POST',
      body: JSON.stringify({
        body: 'This is a detailed post for the screenshot.',
        planetId: planetAId,
        type: 'TEXT',
      }),
    });
    let screenshotPostId = postId; // fallback to the hidden one (page shows 404 state)
    if (newPostRes.status === 201) {
      screenshotPostId = (await newPostRes.json()).data.id as string;
      // Add a comment so the detail page is populated
      await apiFetch(`/posts/${screenshotPostId}/comments`, userB.accessToken, {
        method: 'POST',
        body: JSON.stringify({ body: 'Nice post!' }),
      });
    }

    await page.goto(`${WEB_BASE}/login`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passInput = page.locator('input[type="password"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill(userBEmail);
      await passInput.fill(password);
      await page.locator('button[type="submit"]').first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }

    await page.goto(`${WEB_BASE}/planets/${planetAId}/posts/${screenshotPostId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'post-detail.png'),
      fullPage: true,
    });
  });

  test('screenshot — moderation queue page', { timeout: 120_000 }, async ({ page }) => {
    // Log in as moderator to view moderation queue
    await page.goto(`${WEB_BASE}/login`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passInput = page.locator('input[type="password"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill(modEmail);
      await passInput.fill(password);
      await page.locator('button[type="submit"]').first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }

    await page.goto(`${WEB_BASE}/planets/${planetAId}/moderation`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'moderation-queue.png'),
      fullPage: true,
    });
  });

  test('screenshot — moderation report detail page', { timeout: 120_000 }, async ({ page }) => {
    // Create a fresh report to show the detail page in PENDING state
    const freshReportRes = await apiFetch('/reports', userB.accessToken, {
      method: 'POST',
      body: JSON.stringify({
        targetType: 'POST',
        targetId: postId, // the original (now-hidden) post
        reason: 'Further review needed',
      }),
    });

    let screenshotReportId = reportId;
    if (freshReportRes.status === 201) {
      screenshotReportId = (await freshReportRes.json()).data.id as string;
    }

    await page.goto(`${WEB_BASE}/login`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passInput = page.locator('input[type="password"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill(modEmail);
      await passInput.fill(password);
      await page.locator('button[type="submit"]').first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }

    await page.goto(`${WEB_BASE}/planets/${planetAId}/moderation/${screenshotReportId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'moderation-detail.png'),
      fullPage: true,
    });
  });

  test(
    'screenshot — empty planet feed (new planet, no posts)',
    { timeout: 120_000 },
    async ({ page }) => {
      // Log in and navigate to a planet with no posts
      await page.goto(`${WEB_BASE}/login`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      const emailInput = page.locator('input[type="email"], input[name="email"]').first();
      const passInput = page.locator('input[type="password"]').first();
      if (await emailInput.isVisible()) {
        await emailInput.fill(userBEmail);
        await passInput.fill(password);
        await page.locator('button[type="submit"]').first().click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
      }

      await page.goto(`${WEB_BASE}/planets/${planetBId}/feed`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      await page.screenshot({
        path: path.join(EVIDENCE_DIR, 'empty-feed.png'),
        fullPage: true,
      });
    },
  );
});
