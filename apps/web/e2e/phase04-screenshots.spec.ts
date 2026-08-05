/**
 * Phase 04 — Complete Screenshot Capture (all 9 required)
 *
 * Uses real application data. Logs in as a real user.
 * Creates journals, tags, folders, goals with real content
 * to produce meaningful screenshots.
 */
import { test, expect } from '@playwright/test';
import path from 'node:path';

const API_BASE = 'http://localhost:3000';
const WEB_BASE = 'http://localhost:3100';
const EVIDENCE_DIR = path.resolve(__dirname, '../../../docs/evidence/phase-04/screenshots');

const suffix = Date.now();
const email = `screenshots-${suffix}@wildtails.dev`;
const emailB = `screenshots-b-${suffix}@wildtails.dev`;
const pw = 'screenshot-pass-123';

interface User {
  accessToken: string;
  refreshToken: string;
  userId: string;
}

async function registerApi(em: string, name: string): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: em, password: pw, displayName: name }),
  });
  expect(res.status).toBe(201);
  const d = await res.json();
  const me = await fetch(`${API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${d.data.accessToken}` },
  });
  const meD = await me.json();
  return {
    accessToken: d.data.accessToken,
    refreshToken: d.data.refreshToken,
    userId: meD.data.id,
  };
}

async function api(p: string, token: string, init?: RequestInit) {
  return fetch(`${API_BASE}${p}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers as Record<string, string>),
    },
  });
}

async function loginPage(page: import('@playwright/test').Page, em: string) {
  await page.goto(`${WEB_BASE}/login`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  const emailInput = page.locator('input[type="email"], input[name="email"]').first();
  const passInput = page.locator('input[type="password"]').first();
  if (await emailInput.isVisible()) {
    await emailInput.fill(em);
    await passInput.fill(pw);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
  }
}

let userA: User;
let userB: User;

test.describe.serial('Phase 04 complete screenshot capture', () => {
  let journalId: string;
  let tagId: string;
  let folderId: string;
  let goalId: string;

  test.beforeAll(async () => {
    [userA, userB] = await Promise.all([
      registerApi(email, 'Captain Screenshot'),
      registerApi(emailB, 'Mate Screenshot'),
    ]);

    // Create data for screenshots
    // Tag
    const tagRes = await api('/tags', userA.accessToken, {
      method: 'POST',
      body: JSON.stringify({ name: 'typescript' }),
    });
    tagId = (await tagRes.json()).data.id;

    // Another tag for variety
    await api('/tags', userA.accessToken, {
      method: 'POST',
      body: JSON.stringify({ name: 'learning' }),
    });

    // Folder
    const folderRes = await api('/folders', userA.accessToken, {
      method: 'POST',
      body: JSON.stringify({ name: 'Study Notes' }),
    });
    folderId = (await folderRes.json()).data.id;

    // Goal with progress
    const goalRes = await api('/goals', userA.accessToken, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Master TypeScript',
        description: 'Learn advanced TypeScript patterns and type-level programming.',
        deadline: '2026-12-31T23:59:59.000Z',
      }),
    });
    goalId = (await goalRes.json()).data.id;
    await api(`/goals/${goalId}`, userA.accessToken, {
      method: 'PATCH',
      body: JSON.stringify({ progress: 60 }),
    });

    // Second goal
    const g2Res = await api('/goals', userA.accessToken, {
      method: 'POST',
      body: JSON.stringify({ title: 'Read 10 Books', deadline: '2027-06-01T00:00:00.000Z' }),
    });
    const g2Id = (await g2Res.json()).data.id;
    await api(`/goals/${g2Id}`, userA.accessToken, {
      method: 'PATCH',
      body: JSON.stringify({ progress: 30 }),
    });

    // Journal with rich content
    const body = [
      '# TypeScript Generics Deep Dive',
      '',
      'Today I studied **conditional types** and **mapped types**.',
      '',
      '## Key Concepts',
      '',
      '- `extends` keyword for type constraints',
      '- `infer` for extracting types within conditionals',
      '- Template literal types',
      '',
      '> "Types are the best documentation"',
      '',
      '```typescript',
      'type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;',
      '```',
    ].join('\n');

    const jRes = await api('/journals', userA.accessToken, {
      method: 'POST',
      body: JSON.stringify({
        title: 'TypeScript Generics Deep Dive',
        body,
        tagIds: [tagId],
        folderId,
        goalId,
      }),
    });
    journalId = (await jRes.json()).data.id;

    // Edit to create version
    await api(`/journals/${journalId}`, userA.accessToken, {
      method: 'PATCH',
      body: JSON.stringify({
        body: body + '\n\n## Updated\n\nAdded distributive conditional types.',
      }),
    });

    // Create a second journal for list variety
    await api('/journals', userA.accessToken, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Meeting Notes',
        body: 'Discussed project timeline.',
        folderId,
      }),
    });

    // Create a third journal
    await api('/journals', userA.accessToken, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Book Review: Clean Code',
        body: 'Key takeaways from the book.',
      }),
    });
  });

  // ── 1. Captain's Cabin Dashboard ──────────────────────────────────────────

  test('screenshot: captains-cabin-dashboard', async ({ page }) => {
    await loginPage(page, email);
    await page.goto(`${WEB_BASE}/cabin`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'captains-cabin-dashboard.png'),
      fullPage: true,
    });
  });

  // ── 2. Journal List ──────────────────────────────────────────────────────

  test('screenshot: journal-list', async ({ page }) => {
    await loginPage(page, email);
    await page.goto(`${WEB_BASE}/cabin/journals`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'journal-list.png'), fullPage: true });
  });

  // ── 3. Journal Editor ────────────────────────────────────────────────────

  test('screenshot: journal-editor', async ({ page }) => {
    await loginPage(page, email);
    await page.goto(`${WEB_BASE}/cabin/journals/new`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'journal-editor.png'), fullPage: true });
  });

  // ── 4. Journal Detail ────────────────────────────────────────────────────

  test('screenshot: journal-detail', async ({ page }) => {
    await loginPage(page, email);
    await page.goto(`${WEB_BASE}/cabin/journals/${journalId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'journal-detail.png'), fullPage: true });
  });

  // ── 5. Journal Sharing ───────────────────────────────────────────────────

  test('screenshot: journal-sharing', async () => {
    // Set visibility and grant share via API
    await api(`/journals/${journalId}`, userA.accessToken, {
      method: 'PATCH',
      body: JSON.stringify({ visibility: 'SELECTED_USERS' }),
    });
    await api(`/journals/${journalId}/share`, userA.accessToken, {
      method: 'POST',
      body: JSON.stringify({ journalId, userId: userB.userId }),
    });
  });

  test('screenshot: journal-sharing capture', async ({ page }) => {
    await loginPage(page, email);
    await page.goto(`${WEB_BASE}/cabin/journals/${journalId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    // Scroll down to ensure sharing panel is visible
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'journal-sharing.png'), fullPage: true });
  });

  // ── 6. Goals List ────────────────────────────────────────────────────────

  test('screenshot: goals-list', async ({ page }) => {
    await loginPage(page, email);
    await page.goto(`${WEB_BASE}/goals`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'goals-list.png'), fullPage: true });
  });

  // ── 7. Goal Editor ──────────────────────────────────────────────────────

  test('screenshot: goal-editor', async ({ page }) => {
    await loginPage(page, email);
    await page.goto(`${WEB_BASE}/goals/new`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'goal-editor.png'), fullPage: true });
  });

  // ── 8. Goal Progress ────────────────────────────────────────────────────

  test('screenshot: goal-progress', async ({ page }) => {
    await loginPage(page, email);
    await page.goto(`${WEB_BASE}/goals/${goalId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'goal-progress.png'), fullPage: true });
  });

  // ── 9. Empty State ──────────────────────────────────────────────────────

  test('screenshot: empty-state', async ({ page }) => {
    // Register a brand new user with no data
    const emptyEmail = `empty-${suffix}@wildtails.dev`;
    await registerApi(emptyEmail, 'Empty User');
    await loginPage(page, emptyEmail);
    await page.goto(`${WEB_BASE}/cabin/journals`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(EVIDENCE_DIR, 'empty-state.png'), fullPage: true });
  });

  test.afterAll(async () => {
    for (const u of [userA, userB]) {
      if (u?.accessToken) {
        await api('/auth/logout', u.accessToken, {
          method: 'POST',
          body: JSON.stringify({ refreshToken: u.refreshToken }),
        }).catch(() => {});
      }
    }
  });
});
