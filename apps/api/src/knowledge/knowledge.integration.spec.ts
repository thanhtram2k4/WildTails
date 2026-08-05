/**
 * Phase 04 — Knowledge Domain Integration Tests (PostgreSQL-backed)
 *
 * Requires: Running API server at TEST_API_URL (default http://localhost:3000)
 * Requires: Local Docker PostgreSQL with migration applied
 *
 * Covers:
 * - Journal CRUD, versioning, soft delete
 * - Tag CRUD, normalization, owner uniqueness
 * - Folder CRUD, nesting depth, deletion behavior
 * - Share grant, expiry, immediate revoke, concurrency
 * - Goal CRUD, journal linking, hard delete
 * - Cross-user authorization (privacy-safe 404)
 * - Pagination stability
 * - Visibility transitions
 * - Audit log privacy
 * - Content security
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const API_BASE = process.env['TEST_API_URL'] ?? 'http://localhost:3000';
const DATABASE_URL =
  process.env['DATABASE_URL'] ??
  'postgresql://wildtails:wildtails_local_dev@localhost:5432/wildtails';

async function queryDB<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const pg = await import('pg');
  const client = new pg.default.Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows as T[];
  } finally {
    await client.end();
  }
}

async function apiFetch(path: string, init?: RequestInit & { token?: string }): Promise<Response> {
  const { token, ...rest } = init ?? {};
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(rest.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(`${API_BASE}${path}`, { ...rest, headers });
}

async function registerUser(suffix: string) {
  const email = `integ-p04-${suffix}-${Date.now()}@wildtails.dev`;
  const res = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password: 'test-password-secure-123',
      displayName: `Test ${suffix}`,
    }),
  });
  expect(res.status).toBe(201);
  const data = await res.json();
  return {
    userId: data.data.userId ?? '',
    accessToken: data.data.accessToken as string,
    refreshToken: data.data.refreshToken as string,
    email,
  };
}

async function getUserId(token: string): Promise<string> {
  const res = await apiFetch('/users/me', { token });
  const data = await res.json();
  return data.data.id;
}

// ─── Test state ──────────────────────────────────────────────────────────────
let userA: { userId: string; accessToken: string; refreshToken: string };
let userB: { userId: string; accessToken: string; refreshToken: string };
let userC: { userId: string; accessToken: string; refreshToken: string };

describe('Knowledge Domain Integration (PostgreSQL-backed)', () => {
  beforeAll(async () => {
    const [a, b, c] = await Promise.all([registerUser('A'), registerUser('B'), registerUser('C')]);
    userA = { ...a, userId: await getUserId(a.accessToken) };
    userB = { ...b, userId: await getUserId(b.accessToken) };
    userC = { ...c, userId: await getUserId(c.accessToken) };
  });

  afterAll(async () => {
    for (const user of [userA, userB, userC]) {
      if (user?.accessToken) {
        await apiFetch('/auth/logout', {
          method: 'POST',
          token: user.accessToken,
          body: JSON.stringify({ refreshToken: user.refreshToken }),
        }).catch(() => {});
      }
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TAG CRUD
  // ═══════════════════════════════════════════════════════════════════════════
  let tagId: string;

  describe('Tags', () => {
    it('creates a tag with normalization', async () => {
      const res = await apiFetch('/tags', {
        method: 'POST',
        token: userA.accessToken,
        body: JSON.stringify({ name: '  Study  Notes  ' }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.data.name).toBe('study notes');
      tagId = data.data.id;
    });

    it('rejects duplicate tag name for same owner (409)', async () => {
      const res = await apiFetch('/tags', {
        method: 'POST',
        token: userA.accessToken,
        body: JSON.stringify({ name: 'study notes' }),
      });
      expect(res.status).toBe(409);
    });

    it('allows same tag name for different user', async () => {
      const res = await apiFetch('/tags', {
        method: 'POST',
        token: userB.accessToken,
        body: JSON.stringify({ name: 'study notes' }),
      });
      expect(res.status).toBe(201);
    });

    it('lists own tags only', async () => {
      const res = await apiFetch('/tags', { token: userA.accessToken });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.length).toBeGreaterThanOrEqual(1);
      expect(data.data.every((t: { ownerId: string }) => t.ownerId === userA.userId)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FOLDER CRUD
  // ═══════════════════════════════════════════════════════════════════════════
  let rootFolderId: string;
  let childFolderId: string;

  describe('Folders', () => {
    it('creates a root folder', async () => {
      const res = await apiFetch('/folders', {
        method: 'POST',
        token: userA.accessToken,
        body: JSON.stringify({ name: 'Semester 1' }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.data.name).toBe('Semester 1');
      rootFolderId = data.data.id;
    });

    it('creates a nested folder (depth 2)', async () => {
      const res = await apiFetch('/folders', {
        method: 'POST',
        token: userA.accessToken,
        body: JSON.stringify({ name: 'Week 1', parentId: rootFolderId }),
      });
      expect(res.status).toBe(201);
      childFolderId = (await res.json()).data.id;
    });

    it('creates depth 3 folder', async () => {
      const res = await apiFetch('/folders', {
        method: 'POST',
        token: userA.accessToken,
        body: JSON.stringify({ name: 'Day 1', parentId: childFolderId }),
      });
      expect(res.status).toBe(201);
    });

    it('rejects depth > 3', async () => {
      // Get the depth-3 folder
      const listRes = await apiFetch('/folders', { token: userA.accessToken });
      const folders = (await listRes.json()).data;
      const depth3 = folders.find((f: { name: string }) => f.name === 'Day 1');
      expect(depth3).toBeTruthy();

      const res = await apiFetch('/folders', {
        method: 'POST',
        token: userA.accessToken,
        body: JSON.stringify({ name: 'Too Deep', parentId: depth3.id }),
      });
      expect(res.status).toBe(400);
    });

    it('rejects parent folder owned by another user (privacy-safe 404)', async () => {
      const res = await apiFetch('/folders', {
        method: 'POST',
        token: userB.accessToken,
        body: JSON.stringify({ name: 'Hack', parentId: rootFolderId }),
      });
      expect(res.status).toBe(404);
    });

    it('non-owner cannot update folder (404)', async () => {
      const res = await apiFetch(`/folders/${rootFolderId}`, {
        method: 'PATCH',
        token: userB.accessToken,
        body: JSON.stringify({ name: 'Hacked' }),
      });
      expect(res.status).toBe(404);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GOAL CRUD
  // ═══════════════════════════════════════════════════════════════════════════
  let goalId: string;

  describe('Goals', () => {
    it('creates a goal', async () => {
      const res = await apiFetch('/goals', {
        method: 'POST',
        token: userA.accessToken,
        body: JSON.stringify({ title: 'Learn TypeScript' }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.data.title).toBe('Learn TypeScript');
      expect(data.data.progress).toBe(0);
      goalId = data.data.id;
    });

    it('updates goal progress', async () => {
      const res = await apiFetch(`/goals/${goalId}`, {
        method: 'PATCH',
        token: userA.accessToken,
        body: JSON.stringify({ progress: 50 }),
      });
      expect(res.status).toBe(200);
      expect((await res.json()).data.progress).toBe(50);
    });

    it('non-owner gets 404 for goal', async () => {
      const res = await apiFetch(`/goals/${goalId}`, {
        token: userB.accessToken,
      });
      expect(res.status).toBe(404);
    });

    it('lists own goals only', async () => {
      const res = await apiFetch('/goals', { token: userA.accessToken });
      const data = await res.json();
      expect(data.data.length).toBeGreaterThanOrEqual(1);
      expect(data.data.every((g: { ownerId: string }) => g.ownerId === userA.userId)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // JOURNAL CRUD + VERSIONING
  // ═══════════════════════════════════════════════════════════════════════════
  let journalId: string;

  describe('Journals', () => {
    it('creates a PRIVATE journal (default)', async () => {
      const res = await apiFetch('/journals', {
        method: 'POST',
        token: userA.accessToken,
        body: JSON.stringify({
          title: 'My First Journal',
          body: '# Hello World\n\nThis is my first entry.',
          tagIds: [tagId],
          folderId: rootFolderId,
          goalId,
        }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.data.visibility).toBe('PRIVATE');
      expect(data.data.tags).toHaveLength(1);
      expect(data.data.folder.id).toBe(rootFolderId);
      expect(data.data.goal.id).toBe(goalId);
      journalId = data.data.id;
    });

    it('owner can read own PRIVATE journal', async () => {
      const res = await apiFetch(`/journals/${journalId}`, {
        token: userA.accessToken,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.body).toContain('Hello World');
    });

    it('non-owner gets privacy-safe 404 for PRIVATE journal', async () => {
      const res = await apiFetch(`/journals/${journalId}`, {
        token: userB.accessToken,
      });
      expect(res.status).toBe(404);
    });

    it('UUID guessing returns 404', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const res = await apiFetch(`/journals/${fakeId}`, {
        token: userA.accessToken,
      });
      expect(res.status).toBe(404);
    });

    it('body update creates immutable version', async () => {
      const res = await apiFetch(`/journals/${journalId}`, {
        method: 'PATCH',
        token: userA.accessToken,
        body: JSON.stringify({ body: '# Updated\n\nNew content here.' }),
      });
      expect(res.status).toBe(200);

      const versionsRes = await apiFetch(`/journals/${journalId}/versions`, {
        token: userA.accessToken,
      });
      expect(versionsRes.status).toBe(200);
      const versions = (await versionsRes.json()).data;
      expect(versions.length).toBe(1);
      expect(versions[0].body).toContain('Hello World'); // previous body snapshot
    });

    it('metadata-only update does NOT create version', async () => {
      const res = await apiFetch(`/journals/${journalId}`, {
        method: 'PATCH',
        token: userA.accessToken,
        body: JSON.stringify({ title: 'Updated Title' }),
      });
      expect(res.status).toBe(200);

      const versionsRes = await apiFetch(`/journals/${journalId}/versions`, {
        token: userA.accessToken,
      });
      const versions = (await versionsRes.json()).data;
      expect(versions.length).toBe(1); // Still 1, not 2
    });

    it('lists journals filtered by folderId', async () => {
      const res = await apiFetch(`/journals?folderId=${rootFolderId}`, {
        token: userA.accessToken,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.length).toBeGreaterThanOrEqual(1);
    });

    it('lists journals filtered by tagId', async () => {
      const res = await apiFetch(`/journals?tagId=${tagId}`, {
        token: userA.accessToken,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.length).toBeGreaterThanOrEqual(1);
    });

    it('lists journals filtered by goalId', async () => {
      const res = await apiFetch(`/journals?goalId=${goalId}`, {
        token: userA.accessToken,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.length).toBeGreaterThanOrEqual(1);
    });

    it('non-owner cannot list versions (404)', async () => {
      const res = await apiFetch(`/journals/${journalId}/versions`, {
        token: userB.accessToken,
      });
      expect(res.status).toBe(404);
    });

    it('non-owner cannot update journal (404)', async () => {
      const res = await apiFetch(`/journals/${journalId}`, {
        method: 'PATCH',
        token: userB.accessToken,
        body: JSON.stringify({ title: 'Hacked' }),
      });
      expect(res.status).toBe(404);
    });

    it('non-owner cannot delete journal (404)', async () => {
      const res = await apiFetch(`/journals/${journalId}`, {
        method: 'DELETE',
        token: userB.accessToken,
      });
      expect(res.status).toBe(404);
    });

    it('linkedJournalCount increments on goal', async () => {
      const res = await apiFetch(`/goals/${goalId}`, {
        token: userA.accessToken,
      });
      expect(res.status).toBe(200);
      expect((await res.json()).data.linkedJournalCount).toBeGreaterThanOrEqual(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SHARING + IMMEDIATE REVOKE
  // ═══════════════════════════════════════════════════════════════════════════
  let sharePermissionId: string;

  describe('Sharing', () => {
    it('rejects share when visibility is not SELECTED_USERS (400)', async () => {
      const res = await apiFetch(`/journals/${journalId}/share`, {
        method: 'POST',
        token: userA.accessToken,
        body: JSON.stringify({
          journalId,
          userId: userB.userId,
        }),
      });
      expect(res.status).toBe(400);
    });

    it('change visibility to SELECTED_USERS', async () => {
      const res = await apiFetch(`/journals/${journalId}`, {
        method: 'PATCH',
        token: userA.accessToken,
        body: JSON.stringify({ visibility: 'SELECTED_USERS' }),
      });
      expect(res.status).toBe(200);
    });

    it('grants share to User B', async () => {
      const res = await apiFetch(`/journals/${journalId}/share`, {
        method: 'POST',
        token: userA.accessToken,
        body: JSON.stringify({
          journalId,
          userId: userB.userId,
        }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      sharePermissionId = data.data.id;
    });

    it('User B can read shared journal', async () => {
      const res = await apiFetch(`/journals/${journalId}`, {
        token: userB.accessToken,
      });
      expect(res.status).toBe(200);
      expect((await res.json()).data.body).toBeTruthy();
    });

    it('User C cannot read shared journal (404)', async () => {
      const res = await apiFetch(`/journals/${journalId}`, {
        token: userC.accessToken,
      });
      expect(res.status).toBe(404);
    });

    it('duplicate share grant returns 409', async () => {
      const res = await apiFetch(`/journals/${journalId}/share`, {
        method: 'POST',
        token: userA.accessToken,
        body: JSON.stringify({
          journalId,
          userId: userB.userId,
        }),
      });
      expect(res.status).toBe(409);
    });

    it('self-share returns 400', async () => {
      const res = await apiFetch(`/journals/${journalId}/share`, {
        method: 'POST',
        token: userA.accessToken,
        body: JSON.stringify({
          journalId,
          userId: userA.userId,
        }),
      });
      expect(res.status).toBe(400);
    });

    it('non-owner cannot grant share (404)', async () => {
      const res = await apiFetch(`/journals/${journalId}/share`, {
        method: 'POST',
        token: userB.accessToken,
        body: JSON.stringify({
          journalId,
          userId: userC.userId,
        }),
      });
      expect(res.status).toBe(404);
    });

    it('lists active shares (owner only)', async () => {
      const res = await apiFetch(`/journals/${journalId}/shares`, {
        token: userA.accessToken,
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.length).toBe(1);
    });

    it('non-owner cannot list shares (404)', async () => {
      const res = await apiFetch(`/journals/${journalId}/shares`, {
        token: userB.accessToken,
      });
      expect(res.status).toBe(404);
    });

    it('revokes share — User B immediately denied', async () => {
      // Revoke
      const revokeRes = await apiFetch(`/journals/${journalId}/share/${sharePermissionId}`, {
        method: 'DELETE',
        token: userA.accessToken,
      });
      expect(revokeRes.status).toBe(200);

      // Immediate re-read — must be 404
      const readRes = await apiFetch(`/journals/${journalId}`, {
        token: userB.accessToken,
      });
      expect(readRes.status).toBe(404);
    });

    it('re-grant after revoke is allowed', async () => {
      const res = await apiFetch(`/journals/${journalId}/share`, {
        method: 'POST',
        token: userA.accessToken,
        body: JSON.stringify({
          journalId,
          userId: userB.userId,
        }),
      });
      expect(res.status).toBe(201);

      // User B can read again
      const readRes = await apiFetch(`/journals/${journalId}`, {
        token: userB.accessToken,
      });
      expect(readRes.status).toBe(200);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CONCURRENT SHARE GRANT
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Concurrent share grant', () => {
    it('exactly one succeeds, other returns 409', async () => {
      // Create a new journal for this test
      const createRes = await apiFetch('/journals', {
        method: 'POST',
        token: userA.accessToken,
        body: JSON.stringify({
          title: 'Concurrency Test',
          visibility: 'SELECTED_USERS',
        }),
      });
      const concJournalId = (await createRes.json()).data.id;

      // Fire two concurrent share grants
      const [res1, res2] = await Promise.all([
        apiFetch(`/journals/${concJournalId}/share`, {
          method: 'POST',
          token: userA.accessToken,
          body: JSON.stringify({ journalId: concJournalId, userId: userB.userId }),
        }),
        apiFetch(`/journals/${concJournalId}/share`, {
          method: 'POST',
          token: userA.accessToken,
          body: JSON.stringify({ journalId: concJournalId, userId: userB.userId }),
        }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([201, 409]);

      // Verify exactly one active row
      const rows = await queryDB<{ count: string }>(
        `SELECT COUNT(*) as count FROM share_permissions
         WHERE "journalId" = $1 AND "grantedToUserId" = $2 AND "revokedAt" IS NULL`,
        [concJournalId, userB.userId],
      );
      expect(parseInt(rows[0]!.count, 10)).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // VISIBILITY TRANSITION — revokes old shares
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Visibility transition', () => {
    it('changing away from SELECTED_USERS revokes all active shares', async () => {
      // Create journal with SELECTED_USERS + share
      const createRes = await apiFetch('/journals', {
        method: 'POST',
        token: userA.accessToken,
        body: JSON.stringify({
          title: 'Vis Transition Test',
          visibility: 'SELECTED_USERS',
        }),
      });
      const vtJournalId = (await createRes.json()).data.id;

      await apiFetch(`/journals/${vtJournalId}/share`, {
        method: 'POST',
        token: userA.accessToken,
        body: JSON.stringify({ journalId: vtJournalId, userId: userB.userId }),
      });

      // User B can read
      let readRes = await apiFetch(`/journals/${vtJournalId}`, {
        token: userB.accessToken,
      });
      expect(readRes.status).toBe(200);

      // Change visibility to PRIVATE
      await apiFetch(`/journals/${vtJournalId}`, {
        method: 'PATCH',
        token: userA.accessToken,
        body: JSON.stringify({ visibility: 'PRIVATE' }),
      });

      // User B can no longer read
      readRes = await apiFetch(`/journals/${vtJournalId}`, {
        token: userB.accessToken,
      });
      expect(readRes.status).toBe(404);

      // Shares are revoked in DB
      const rows = await queryDB<{ count: string }>(
        `SELECT COUNT(*) as count FROM share_permissions
         WHERE "journalId" = $1 AND "revokedAt" IS NULL`,
        [vtJournalId],
      );
      expect(parseInt(rows[0]!.count, 10)).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC + PLANET_MEMBERS
  // ═══════════════════════════════════════════════════════════════════════════
  describe('PUBLIC visibility', () => {
    it('PUBLIC journal is accessible to any authenticated user', async () => {
      const createRes = await apiFetch('/journals', {
        method: 'POST',
        token: userA.accessToken,
        body: JSON.stringify({
          title: 'Public Journal',
          body: 'Everyone can read this',
          visibility: 'PUBLIC',
        }),
      });
      const pubJournalId = (await createRes.json()).data.id;

      const readRes = await apiFetch(`/journals/${pubJournalId}`, {
        token: userC.accessToken,
      });
      expect(readRes.status).toBe(200);
      expect((await readRes.json()).data.body).toBe('Everyone can read this');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TAG DELETION
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Tag deletion', () => {
    it('deleting a tag preserves journals', async () => {
      // Create a new tag and journal using it
      const tagRes = await apiFetch('/tags', {
        method: 'POST',
        token: userA.accessToken,
        body: JSON.stringify({ name: 'deleteme' }),
      });
      const delTagId = (await tagRes.json()).data.id;

      const jRes = await apiFetch('/journals', {
        method: 'POST',
        token: userA.accessToken,
        body: JSON.stringify({ title: 'Tagged Journal', tagIds: [delTagId] }),
      });
      const taggedJournalId = (await jRes.json()).data.id;

      // Delete the tag
      const delRes = await apiFetch(`/tags/${delTagId}`, {
        method: 'DELETE',
        token: userA.accessToken,
      });
      expect(delRes.status).toBe(200);

      // Journal still exists
      const readRes = await apiFetch(`/journals/${taggedJournalId}`, {
        token: userA.accessToken,
      });
      expect(readRes.status).toBe(200);
      // Tag is no longer associated
      expect((await readRes.json()).data.tags).toHaveLength(0);
    });

    it("non-owner cannot delete another user's tag (404)", async () => {
      // Create tag as User A
      const tagRes = await apiFetch('/tags', {
        method: 'POST',
        token: userA.accessToken,
        body: JSON.stringify({ name: 'user-a-private-tag' }),
      });
      const aTagId = (await tagRes.json()).data.id;

      // User B tries to delete
      const res = await apiFetch(`/tags/${aTagId}`, {
        method: 'DELETE',
        token: userB.accessToken,
      });
      expect(res.status).toBe(404);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FOLDER DELETION
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Folder deletion', () => {
    it('deleting folder unparents journals and child folders', async () => {
      // Create folder and journal in it
      const folderRes = await apiFetch('/folders', {
        method: 'POST',
        token: userA.accessToken,
        body: JSON.stringify({ name: 'To Delete' }),
      });
      const delFolderId = (await folderRes.json()).data.id;

      const childRes = await apiFetch('/folders', {
        method: 'POST',
        token: userA.accessToken,
        body: JSON.stringify({ name: 'Child of Delete', parentId: delFolderId }),
      });
      const childId = (await childRes.json()).data.id;

      const jRes = await apiFetch('/journals', {
        method: 'POST',
        token: userA.accessToken,
        body: JSON.stringify({ title: 'In Deleted Folder', folderId: delFolderId }),
      });
      const jId = (await jRes.json()).data.id;

      // Delete the folder
      const delRes = await apiFetch(`/folders/${delFolderId}`, {
        method: 'DELETE',
        token: userA.accessToken,
      });
      expect(delRes.status).toBe(200);

      // Journal is unparented
      const journalRes = await apiFetch(`/journals/${jId}`, {
        token: userA.accessToken,
      });
      const journalData = (await journalRes.json()).data;
      expect(journalData.folder).toBeUndefined();

      // Child folder is unparented
      const rows = await queryDB<{ parentId: string | null }>(
        `SELECT "parentId" FROM folders WHERE id = $1`,
        [childId],
      );
      expect(rows[0]!.parentId).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GOAL DELETION
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Goal deletion', () => {
    it('deleting goal unlinks journals', async () => {
      // Create goal + journal linked to it
      const gRes = await apiFetch('/goals', {
        method: 'POST',
        token: userA.accessToken,
        body: JSON.stringify({ title: 'Goal to Delete' }),
      });
      const delGoalId = (await gRes.json()).data.id;

      const jRes = await apiFetch('/journals', {
        method: 'POST',
        token: userA.accessToken,
        body: JSON.stringify({ title: 'Linked to goal', goalId: delGoalId }),
      });
      const linkedJId = (await jRes.json()).data.id;

      // Delete goal
      const delRes = await apiFetch(`/goals/${delGoalId}`, {
        method: 'DELETE',
        token: userA.accessToken,
      });
      expect(delRes.status).toBe(200);

      // Journal still exists but goalId is null
      const readRes = await apiFetch(`/journals/${linkedJId}`, {
        token: userA.accessToken,
      });
      expect((await readRes.json()).data.goal).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SOFT DELETE
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Journal soft delete', () => {
    it('soft-deleted journal returns 404', async () => {
      const delRes = await apiFetch(`/journals/${journalId}`, {
        method: 'DELETE',
        token: userA.accessToken,
      });
      expect(delRes.status).toBe(200);

      const readRes = await apiFetch(`/journals/${journalId}`, {
        token: userA.accessToken,
      });
      expect(readRes.status).toBe(404);
    });

    it('soft-deleted journal does not appear in list', async () => {
      const res = await apiFetch('/journals', { token: userA.accessToken });
      const data = await res.json();
      const found = data.data.find((j: { id: string }) => j.id === journalId);
      expect(found).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGINATION STABILITY
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Pagination', () => {
    it('cursor pagination produces no duplicates', async () => {
      // Create 5 journals
      const ids: string[] = [];
      for (let i = 0; i < 5; i++) {
        const res = await apiFetch('/journals', {
          method: 'POST',
          token: userA.accessToken,
          body: JSON.stringify({ title: `Paginated ${i}` }),
        });
        ids.push((await res.json()).data.id);
      }

      // Fetch page 1 (limit=2)
      const page1Res = await apiFetch('/journals?limit=2', {
        token: userA.accessToken,
      });
      const page1 = await page1Res.json();
      expect(page1.data.length).toBe(2);
      expect(page1.meta.hasMore).toBe(true);
      expect(page1.meta.cursor).toBeTruthy();

      // Fetch page 2
      const page2Res = await apiFetch(
        `/journals?limit=2&cursor=${encodeURIComponent(page1.meta.cursor)}`,
        {
          token: userA.accessToken,
        },
      );
      const page2 = await page2Res.json();
      expect(page2.data.length).toBe(2);

      // No duplicates between pages
      const page1Ids = page1.data.map((j: { id: string }) => j.id);
      const page2Ids = page2.data.map((j: { id: string }) => j.id);
      const intersection = page1Ids.filter((id: string) => page2Ids.includes(id));
      expect(intersection).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // AUDIT LOG PRIVACY
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Audit log privacy', () => {
    it('audit logs do not contain journal body', async () => {
      // Query audit logs for journal delete actions
      const rows = await queryDB<{ metadata: unknown; action: string }>(
        `SELECT action, metadata FROM audit_logs
         WHERE "targetType" = 'Journal' AND "userId" = $1
         ORDER BY "createdAt" DESC LIMIT 10`,
        [userA.userId],
      );
      for (const row of rows) {
        const meta = JSON.stringify(row.metadata ?? '');
        expect(meta).not.toContain('Hello World');
        expect(meta).not.toContain('Updated\n\nNew content');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CONTENT SECURITY
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Content security', () => {
    it('accepts script tags in body (stored as-is, sanitized at render)', async () => {
      const res = await apiFetch('/journals', {
        method: 'POST',
        token: userA.accessToken,
        body: JSON.stringify({
          title: 'XSS Test',
          body: '<script>alert("xss")</script>',
        }),
      });
      // Body is stored — XSS prevention is at the rendering layer
      expect(res.status).toBe(201);
    });

    it('rejects body exceeding 50,000 characters', async () => {
      const res = await apiFetch('/journals', {
        method: 'POST',
        token: userA.accessToken,
        body: JSON.stringify({
          title: 'Oversized',
          body: 'x'.repeat(50_001),
        }),
      });
      expect(res.status).toBe(400);
    });

    it('rejects more than 20 tags', async () => {
      // Create 21 tags
      const tagIds: string[] = [];
      for (let i = 0; i < 21; i++) {
        const res = await apiFetch('/tags', {
          method: 'POST',
          token: userA.accessToken,
          body: JSON.stringify({ name: `tag-limit-${i}-${Date.now()}` }),
        });
        if (res.status === 201) {
          tagIds.push((await res.json()).data.id);
        }
      }

      const res = await apiFetch('/journals', {
        method: 'POST',
        token: userA.accessToken,
        body: JSON.stringify({ title: 'Too Many Tags', tagIds }),
      });
      expect(res.status).toBe(400);
    });

    it('rejects unexpected fields (stripped by Zod)', async () => {
      const res = await apiFetch('/journals', {
        method: 'POST',
        token: userA.accessToken,
        body: JSON.stringify({
          title: 'Valid',
          ownerId: userB.userId, // should be ignored
          __proto__: { admin: true },
        }),
      });
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.data.ownerId).toBe(userA.userId); // ownerId from principal, not input
    });

    it('SQL injection strings are handled safely', async () => {
      const res = await apiFetch('/journals', {
        method: 'POST',
        token: userA.accessToken,
        body: JSON.stringify({
          title: "Robert'; DROP TABLE journals;--",
          body: "1' OR '1'='1",
        }),
      });
      expect(res.status).toBe(201);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SHARE EXPIRY
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Share expiry', () => {
    it('expired share denies access', async () => {
      // Create journal with SELECTED_USERS
      const createRes = await apiFetch('/journals', {
        method: 'POST',
        token: userA.accessToken,
        body: JSON.stringify({
          title: 'Expiry Test',
          visibility: 'SELECTED_USERS',
        }),
      });
      const expiryJournalId = (await createRes.json()).data.id;

      // Grant with expiry in the past
      const pastDate = new Date(Date.now() - 60_000).toISOString();
      await apiFetch(`/journals/${expiryJournalId}/share`, {
        method: 'POST',
        token: userA.accessToken,
        body: JSON.stringify({
          journalId: expiryJournalId,
          userId: userB.userId,
          expiresAt: pastDate,
        }),
      });

      // User B should be denied
      const readRes = await apiFetch(`/journals/${expiryJournalId}`, {
        token: userB.accessToken,
      });
      expect(readRes.status).toBe(404);
    });
  });
});
