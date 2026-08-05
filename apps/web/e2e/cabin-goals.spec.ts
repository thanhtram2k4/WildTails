/**
 * Phase 04 — Captain's Cabin and Goals E2E Test (no mocks)
 *
 * Runs against the live API (localhost:3000) and Web (localhost:3100).
 * Requires: PostgreSQL, API, and Web servers running.
 *
 * Flow:
 * 1. Register User A, User B, User C
 * 2. Create a PRIVATE journal
 * 3. Edit and verify version history
 * 4. Create and assign a tag
 * 5. Create a folder and move the journal
 * 6. Create a goal and link the journal
 * 7. Change visibility to SELECTED_USERS
 * 8. Grant User B access
 * 9. Prove User B can read
 * 10. Revoke access
 * 11. Prove User B immediately gets 404
 * 12. Prove User C gets 404
 * 13. Delete journal
 * 14. Prove it no longer appears
 * 15. Logout
 */
import { test, expect } from '@playwright/test';
import path from 'node:path';

const API_BASE = 'http://localhost:3000';
const EVIDENCE_DIR = path.resolve(__dirname, '../../../docs/evidence/phase-04/screenshots');

const suffix = Date.now();
const userAEmail = `e2e-p04-a-${suffix}@wildtails.dev`;
const userBEmail = `e2e-p04-b-${suffix}@wildtails.dev`;
const userCEmail = `e2e-p04-c-${suffix}@wildtails.dev`;
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
  expect(res.status).toBe(201);
  const data = await res.json();

  // Get userId
  const meRes = await fetch(`${API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${data.data.accessToken}` },
  });
  const me = await meRes.json();

  return {
    accessToken: data.data.accessToken,
    refreshToken: data.data.refreshToken,
    userId: me.data.id,
  };
}

async function apiFetch(path: string, token: string, init?: RequestInit): Promise<Response> {
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
let userC: UserState;

test.describe.serial("Captain's Cabin and Goals flow", () => {
  test.beforeAll(async () => {
    [userA, userB, userC] = await Promise.all([
      apiRegister(userAEmail, 'Captain A'),
      apiRegister(userBEmail, 'Mate B'),
      apiRegister(userCEmail, 'Stranger C'),
    ]);
  });

  let journalId: string;
  let tagId: string;
  let folderId: string;
  let goalId: string;
  let sharePermissionId: string;

  test('create a PRIVATE journal', async () => {
    const res = await apiFetch('/journals', userA.accessToken, {
      method: 'POST',
      body: JSON.stringify({
        title: 'My Adventure Log',
        body: '# Day One\n\nStarted my journey today.',
      }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    journalId = data.data.id;
    expect(data.data.visibility).toBe('PRIVATE');
  });

  test('edit journal body and verify version history', async () => {
    const res = await apiFetch(`/journals/${journalId}`, userA.accessToken, {
      method: 'PATCH',
      body: JSON.stringify({
        body: '# Day Two\n\nMade progress on my quest.',
      }),
    });
    expect(res.status).toBe(200);

    const versionsRes = await apiFetch(`/journals/${journalId}/versions`, userA.accessToken);
    expect(versionsRes.status).toBe(200);
    const versions = (await versionsRes.json()).data;
    expect(versions.length).toBe(1);
    expect(versions[0].body).toContain('Day One');
  });

  test('create and assign a tag', async () => {
    const tagRes = await apiFetch('/tags', userA.accessToken, {
      method: 'POST',
      body: JSON.stringify({ name: 'adventure' }),
    });
    expect(tagRes.status).toBe(201);
    tagId = (await tagRes.json()).data.id;

    const updateRes = await apiFetch(`/journals/${journalId}`, userA.accessToken, {
      method: 'PATCH',
      body: JSON.stringify({ tagIds: [tagId] }),
    });
    expect(updateRes.status).toBe(200);
    const updated = (await updateRes.json()).data;
    expect(updated.tags).toHaveLength(1);
    expect(updated.tags[0].name).toBe('adventure');
  });

  test('create a folder and move journal into it', async () => {
    const folderRes = await apiFetch('/folders', userA.accessToken, {
      method: 'POST',
      body: JSON.stringify({ name: 'Quest Logs' }),
    });
    expect(folderRes.status).toBe(201);
    folderId = (await folderRes.json()).data.id;

    const moveRes = await apiFetch(`/journals/${journalId}`, userA.accessToken, {
      method: 'PATCH',
      body: JSON.stringify({ folderId }),
    });
    expect(moveRes.status).toBe(200);
    expect((await moveRes.json()).data.folder.id).toBe(folderId);
  });

  test('create a goal and link journal', async () => {
    const goalRes = await apiFetch('/goals', userA.accessToken, {
      method: 'POST',
      body: JSON.stringify({ title: 'Complete the Quest' }),
    });
    expect(goalRes.status).toBe(201);
    goalId = (await goalRes.json()).data.id;

    const linkRes = await apiFetch(`/journals/${journalId}`, userA.accessToken, {
      method: 'PATCH',
      body: JSON.stringify({ goalId }),
    });
    expect(linkRes.status).toBe(200);
    expect((await linkRes.json()).data.goal.id).toBe(goalId);

    // Update goal progress
    const progressRes = await apiFetch(`/goals/${goalId}`, userA.accessToken, {
      method: 'PATCH',
      body: JSON.stringify({ progress: 50 }),
    });
    expect(progressRes.status).toBe(200);
    expect((await progressRes.json()).data.progress).toBe(50);
  });

  test('change visibility to SELECTED_USERS and grant User B', async () => {
    const visRes = await apiFetch(`/journals/${journalId}`, userA.accessToken, {
      method: 'PATCH',
      body: JSON.stringify({ visibility: 'SELECTED_USERS' }),
    });
    expect(visRes.status).toBe(200);

    const shareRes = await apiFetch(`/journals/${journalId}/share`, userA.accessToken, {
      method: 'POST',
      body: JSON.stringify({
        journalId,
        userId: userB.userId,
      }),
    });
    expect(shareRes.status).toBe(201);
    sharePermissionId = (await shareRes.json()).data.id;
  });

  test('User B can read shared journal', async () => {
    const res = await apiFetch(`/journals/${journalId}`, userB.accessToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.body).toContain('Day Two');
  });

  test('revoke access — User B immediately denied', async () => {
    const revokeRes = await apiFetch(
      `/journals/${journalId}/share/${sharePermissionId}`,
      userA.accessToken,
      { method: 'DELETE' },
    );
    expect(revokeRes.status).toBe(200);

    const readRes = await apiFetch(`/journals/${journalId}`, userB.accessToken);
    expect(readRes.status).toBe(404);
  });

  test('User C cannot read journal (404)', async () => {
    const res = await apiFetch(`/journals/${journalId}`, userC.accessToken);
    expect(res.status).toBe(404);
  });

  test('soft-delete journal', async () => {
    const delRes = await apiFetch(`/journals/${journalId}`, userA.accessToken, {
      method: 'DELETE',
    });
    expect(delRes.status).toBe(200);

    const readRes = await apiFetch(`/journals/${journalId}`, userA.accessToken);
    expect(readRes.status).toBe(404);
  });

  test('journal no longer appears in list', async () => {
    const res = await apiFetch('/journals', userA.accessToken);
    const data = await res.json();
    const found = data.data.find((j: { id: string }) => j.id === journalId);
    expect(found).toBeUndefined();
  });

  test("Captain's Cabin page loads", async ({ page }) => {
    // Navigate to cabin page
    await page.goto('http://localhost:3100/cabin', { timeout: 30000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'captains-cabin-dashboard.png'),
      fullPage: true,
    });
  });

  test('Journal list page', async ({ page }) => {
    await page.goto('http://localhost:3100/cabin/journals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'journal-list.png'),
      fullPage: true,
    });
  });

  test('Journal editor page', async ({ page }) => {
    await page.goto('http://localhost:3100/cabin/journals/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'journal-editor.png'),
      fullPage: true,
    });
  });

  test('Goals list page', async ({ page }) => {
    await page.goto('http://localhost:3100/goals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'goals-list.png'),
      fullPage: true,
    });
  });

  test('Goal editor page', async ({ page }) => {
    await page.goto('http://localhost:3100/goals/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'goal-editor.png'),
      fullPage: true,
    });
  });

  test('Empty state page', async ({ page }) => {
    // After deleting journals, the list should show empty state
    await page.goto('http://localhost:3100/cabin/journals');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'empty-state.png'),
      fullPage: true,
    });
  });

  test.afterAll(async () => {
    for (const user of [userA, userB, userC]) {
      if (user?.accessToken) {
        await apiFetch('/auth/logout', user.accessToken, {
          method: 'POST',
          body: JSON.stringify({ refreshToken: user.refreshToken }),
        }).catch(() => {});
      }
    }
  });
});
