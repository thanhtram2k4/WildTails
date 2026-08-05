/**
 * Phase 04 — Closure Verification: Missing Screenshots + Functional Assertions
 *
 * Captures the three missing screenshots with real application data:
 * 1. journal-detail.png — rendered Markdown, tag, folder, goal, version history
 * 2. journal-sharing.png — owner sharing panel with active recipient
 * 3. goal-progress.png — progress bar, deadline, linked journal count
 *
 * Also runs functional assertions for:
 * - Journal detail displays the saved body
 * - Journal version history is accessible
 * - Owner sharing panel lists the active recipient
 * - User B can read while the share is active
 * - User B immediately receives privacy-safe 404 after revoke
 * - Goal detail displays stored progress
 * - Linked journal count is correct
 */
import { test, expect } from '@playwright/test';
import path from 'node:path';

const API_BASE = 'http://localhost:3000';
const WEB_BASE = 'http://localhost:3100';
const EVIDENCE_DIR = path.resolve(__dirname, '../../../docs/evidence/phase-04/screenshots');

const suffix = Date.now();
const password = 'e2e-verify-password-123';

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
  expect(res.status).toBe(201);
  const body = await res.json();
  const meRes = await fetch(`${API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${body.data.accessToken}` },
  });
  const me = await meRes.json();
  return {
    accessToken: body.data.accessToken,
    refreshToken: body.data.refreshToken,
    userId: me.data.id,
  };
}

async function api(path: string, token: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers as Record<string, string>),
    },
  });
}

let userA: UserState;
let userB: UserState;

test.describe.serial('Phase 04 closure verification screenshots', () => {
  let journalId: string;
  let tagId: string;
  let folderId: string;
  let goalId: string;
  let sharePermissionId: string;

  test.beforeAll(async () => {
    [userA, userB] = await Promise.all([
      apiRegister(`verify-a-${suffix}@wildtails.dev`, 'Captain Verify'),
      apiRegister(`verify-b-${suffix}@wildtails.dev`, 'Mate Verify'),
    ]);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Setup: Create journal with tag, folder, goal, version
  // ───────────────────────────────────────────────────────────────────────────

  test('setup: create tag, folder, goal', async () => {
    // Create tag
    const tagRes = await api('/tags', userA.accessToken, {
      method: 'POST',
      body: JSON.stringify({ name: 'study notes' }),
    });
    expect(tagRes.status).toBe(201);
    tagId = (await tagRes.json()).data.id;

    // Create folder
    const folderRes = await api('/folders', userA.accessToken, {
      method: 'POST',
      body: JSON.stringify({ name: 'Semester 1' }),
    });
    expect(folderRes.status).toBe(201);
    folderId = (await folderRes.json()).data.id;

    // Create goal with deadline and progress
    const goalRes = await api('/goals', userA.accessToken, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Master TypeScript',
        description: 'Learn advanced TypeScript patterns and type-level programming.',
        deadline: '2026-12-31T23:59:59.000Z',
      }),
    });
    expect(goalRes.status).toBe(201);
    goalId = (await goalRes.json()).data.id;

    // Set goal progress to 60%
    const progressRes = await api(`/goals/${goalId}`, userA.accessToken, {
      method: 'PATCH',
      body: JSON.stringify({ progress: 60 }),
    });
    expect(progressRes.status).toBe(200);
    expect((await progressRes.json()).data.progress).toBe(60);
  });

  test('setup: create journal with rich content', async () => {
    const journalBody = [
      '# TypeScript Generics Deep Dive',
      '',
      'Today I learned about **conditional types** and **mapped types**.',
      '',
      '## Key Concepts',
      '',
      '- `extends` keyword for type constraints',
      '- `infer` for extracting types within conditionals',
      '- Template literal types for string manipulation',
      '',
      '> "Types are the best documentation" — Unknown',
      '',
      '```typescript',
      'type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;',
      '```',
      '',
      'Next steps: practice with real-world utility types.',
    ].join('\n');

    const createRes = await api('/journals', userA.accessToken, {
      method: 'POST',
      body: JSON.stringify({
        title: 'TypeScript Generics Deep Dive',
        body: journalBody,
        tagIds: [tagId],
        folderId,
        goalId,
      }),
    });
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()).data;
    journalId = created.id;
    expect(created.tags).toHaveLength(1);
    expect(created.folder.id).toBe(folderId);
    expect(created.goal.id).toBe(goalId);
  });

  test('setup: edit journal body to create a version', async () => {
    const updateRes = await api(`/journals/${journalId}`, userA.accessToken, {
      method: 'PATCH',
      body: JSON.stringify({
        body: [
          '# TypeScript Generics Deep Dive',
          '',
          'Today I learned about **conditional types** and **mapped types**.',
          '',
          '## Key Concepts',
          '',
          '- `extends` keyword for type constraints',
          '- `infer` for extracting types within conditionals',
          '- Template literal types for string manipulation',
          '- Distributive conditional types',
          '',
          '> "Types are the best documentation" — Unknown',
          '',
          '```typescript',
          'type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;',
          '```',
          '',
          '## Progress',
          '',
          'Added distributive conditional types to my toolkit.',
          'Next steps: practice with real-world utility types.',
        ].join('\n'),
      }),
    });
    expect(updateRes.status).toBe(200);

    // Verify version was created
    const versionsRes = await api(`/journals/${journalId}/versions`, userA.accessToken);
    expect(versionsRes.status).toBe(200);
    const versions = (await versionsRes.json()).data;
    expect(versions.length).toBeGreaterThanOrEqual(1);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Functional assertion: journal detail displays saved body
  // ───────────────────────────────────────────────────────────────────────────

  test('journal detail displays saved body and version history', async () => {
    // API-level check: body is returned
    const getRes = await api(`/journals/${journalId}`, userA.accessToken);
    expect(getRes.status).toBe(200);
    const journal = (await getRes.json()).data;
    expect(journal.body).toContain('TypeScript Generics Deep Dive');
    expect(journal.body).toContain('Distributive conditional types');

    // Versions are accessible
    const vRes = await api(`/journals/${journalId}/versions`, userA.accessToken);
    expect(vRes.status).toBe(200);
    const versions = (await vRes.json()).data;
    expect(versions.length).toBeGreaterThanOrEqual(1);
    // Previous version contains original body
    expect(versions[0].body).toContain('Next steps: practice with real-world utility types.');
    expect(versions[0].body).not.toContain('Distributive conditional types');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Screenshot A: journal-detail.png
  // ───────────────────────────────────────────────────────────────────────────

  test('capture journal-detail.png', async ({ page }) => {
    // Log in as User A via the login page
    await page.goto(`${WEB_BASE}/login`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Fill login form
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passInput = page.locator('input[type="password"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill(`verify-a-${suffix}@wildtails.dev`);
      await passInput.fill(password);
      await page.locator('button[type="submit"]').first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }

    // Navigate to journal detail
    await page.goto(`${WEB_BASE}/cabin/journals/${journalId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'journal-detail.png'),
      fullPage: true,
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Sharing setup + functional assertions
  // ───────────────────────────────────────────────────────────────────────────

  test('sharing: grant User B access, verify read, then revoke', async () => {
    // Set visibility to SELECTED_USERS
    const visRes = await api(`/journals/${journalId}`, userA.accessToken, {
      method: 'PATCH',
      body: JSON.stringify({ visibility: 'SELECTED_USERS' }),
    });
    expect(visRes.status).toBe(200);

    // Grant User B
    const shareRes = await api(`/journals/${journalId}/share`, userA.accessToken, {
      method: 'POST',
      body: JSON.stringify({ journalId, userId: userB.userId }),
    });
    expect(shareRes.status).toBe(201);
    sharePermissionId = (await shareRes.json()).data.id;

    // Owner sharing panel lists active recipient
    const sharesRes = await api(`/journals/${journalId}/shares`, userA.accessToken);
    expect(sharesRes.status).toBe(200);
    const shares = (await sharesRes.json()).data;
    expect(shares.length).toBe(1);
    expect(shares[0].userId).toBe(userB.userId);

    // User B can read while share is active
    const readRes = await api(`/journals/${journalId}`, userB.accessToken);
    expect(readRes.status).toBe(200);
    const readData = (await readRes.json()).data;
    expect(readData.body).toContain('TypeScript Generics Deep Dive');

    // Revoke
    const revokeRes = await api(
      `/journals/${journalId}/share/${sharePermissionId}`,
      userA.accessToken,
      { method: 'DELETE' },
    );
    expect(revokeRes.status).toBe(200);

    // User B immediately receives privacy-safe 404
    const deniedRes = await api(`/journals/${journalId}`, userB.accessToken);
    expect(deniedRes.status).toBe(404);
  });

  test('sharing: re-grant for screenshot', async () => {
    // Re-grant so the sharing panel has content for the screenshot
    const shareRes = await api(`/journals/${journalId}/share`, userA.accessToken, {
      method: 'POST',
      body: JSON.stringify({ journalId, userId: userB.userId }),
    });
    expect(shareRes.status).toBe(201);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Screenshot B: journal-sharing.png
  // ───────────────────────────────────────────────────────────────────────────

  test('capture journal-sharing.png', async ({ page }) => {
    // Log in as User A
    await page.goto(`${WEB_BASE}/login`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passInput = page.locator('input[type="password"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill(`verify-a-${suffix}@wildtails.dev`);
      await passInput.fill(password);
      await page.locator('button[type="submit"]').first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }

    // Navigate to journal detail (which includes sharing panel)
    await page.goto(`${WEB_BASE}/cabin/journals/${journalId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'journal-sharing.png'),
      fullPage: true,
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Goal progress functional assertions
  // ───────────────────────────────────────────────────────────────────────────

  test('goal detail displays stored progress and linked journal count', async () => {
    const goalRes = await api(`/goals/${goalId}`, userA.accessToken);
    expect(goalRes.status).toBe(200);
    const goal = (await goalRes.json()).data;
    expect(goal.title).toBe('Master TypeScript');
    expect(goal.progress).toBe(60);
    expect(goal.deadline).toBe('2026-12-31T23:59:59.000Z');
    expect(goal.linkedJournalCount).toBeGreaterThanOrEqual(1);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Screenshot C: goal-progress.png
  // ───────────────────────────────────────────────────────────────────────────

  test('capture goal-progress.png', async ({ page }) => {
    // Log in as User A
    await page.goto(`${WEB_BASE}/login`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passInput = page.locator('input[type="password"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill(`verify-a-${suffix}@wildtails.dev`);
      await passInput.fill(password);
      await page.locator('button[type="submit"]').first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }

    // Navigate to goal detail
    await page.goto(`${WEB_BASE}/goals/${goalId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'goal-progress.png'),
      fullPage: true,
    });
  });

  test.afterAll(async () => {
    for (const user of [userA, userB]) {
      if (user?.accessToken) {
        await api('/auth/logout', user.accessToken, {
          method: 'POST',
          body: JSON.stringify({ refreshToken: user.refreshToken }),
        }).catch(() => {});
      }
    }
  });
});
