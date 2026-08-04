/**
 * Phase 03 — Auth Integration Tests (PostgreSQL-backed)
 *
 * Requires: Running API server at TEST_API_URL (default http://localhost:3000)
 * Requires: Local Docker PostgreSQL with migration applied
 *
 * Covers:
 * - Concurrent refresh token rotation with grace interval
 * - Direct DB verification of token rows
 * - Winner successor validity
 * - Genuine replay detection after grace interval
 * - Committed family revocation
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createHash } from 'node:crypto';

const API_BASE = process.env['TEST_API_URL'] ?? 'http://localhost:3000';
const DATABASE_URL =
  process.env['DATABASE_URL'] ??
  'postgresql://wildtails:wildtails_local_dev@localhost:5432/wildtails';

// Direct DB query helper — uses pg via dynamic import to avoid bundling issues
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

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
}

const testEmail = `integ-${Date.now()}@wildtails.dev`;
const testPassword = 'integration-test-password-123';
let accessToken: string;
let refreshToken: string;

describe('Auth Integration (PostgreSQL-backed)', () => {
  beforeAll(async () => {
    const res = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        displayName: 'Integration Test User',
      }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    accessToken = data.data.accessToken;
    refreshToken = data.data.refreshToken;
  });

  afterAll(async () => {
    if (accessToken && refreshToken) {
      await apiFetch('/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {});
    }
  });

  it('registration returns tokens', () => {
    expect(accessToken).toBeTruthy();
    expect(refreshToken).toBeTruthy();
  });

  describe('Concurrent refresh token rotation', () => {
    let winnerRefreshToken: string | null = null;
    let originalTokenHash: string;
    let originalFamily: string;

    it('records the original token family', async () => {
      originalTokenHash = sha256(refreshToken);
      const rows = await queryDB<{ family: string }>(
        'SELECT family FROM refresh_tokens WHERE "tokenHash" = $1',
        [originalTokenHash],
      );
      expect(rows.length).toBe(1);
      originalFamily = rows[0]!.family;
    });

    it('exactly one of two concurrent refreshes succeeds', async () => {
      const [res1, res2] = await Promise.all([
        apiFetch('/auth/refresh', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        }),
        apiFetch('/auth/refresh', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        }),
      ]);

      const results = [
        { status: res1.status, body: await res1.json() },
        { status: res2.status, body: await res2.json() },
      ];

      const successes = results.filter((r) => r.status === 200);
      const failures = results.filter((r) => r.status === 401);

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);

      winnerRefreshToken = successes[0]!.body.data.refreshToken;
      accessToken = successes[0]!.body.data.accessToken;
    });

    it('DB: exactly one successor row was created', async () => {
      const rows = await queryDB<{ id: string }>(
        'SELECT id FROM refresh_tokens WHERE family = $1 AND "replacedByTokenId" IS NULL AND "revokedAt" IS NULL',
        [originalFamily],
      );
      // The successor token: has no replacedByTokenId (it's the current active one)
      expect(rows.length).toBe(1);
    });

    it('DB: the concurrent loser did NOT revoke any token in the winner family', async () => {
      const revokedRows = await queryDB<{ id: string }>(
        'SELECT id FROM refresh_tokens WHERE family = $1 AND "revokedAt" IS NOT NULL',
        [originalFamily],
      );
      expect(revokedRows.length).toBe(0);
    });

    it('the winner successor token is valid for another refresh', async () => {
      expect(winnerRefreshToken).toBeTruthy();
      const res = await apiFetch('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: winnerRefreshToken }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.accessToken).toBeTruthy();
      expect(data.data.refreshToken).toBeTruthy();
      refreshToken = data.data.refreshToken;
      accessToken = data.data.accessToken;
    });
  });

  describe('Genuine replay detection after grace interval', () => {
    let consumedToken: string;
    let successorToken: string;
    let replayFamily: string;

    beforeAll(async () => {
      // Fresh login for a clean family
      const loginRes = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: testEmail, password: testPassword }),
      });
      const loginData = await loginRes.json();
      consumedToken = loginData.data.refreshToken;
      accessToken = loginData.data.accessToken;

      const consumedHash = sha256(consumedToken);
      const rows = await queryDB<{ family: string }>(
        'SELECT family FROM refresh_tokens WHERE "tokenHash" = $1',
        [consumedHash],
      );
      replayFamily = rows[0]!.family;
    });

    it('normal rotation produces a successor', async () => {
      const res = await apiFetch('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: consumedToken }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      successorToken = data.data.refreshToken;
      accessToken = data.data.accessToken;
    });

    it('wait beyond the grace interval', async () => {
      // The grace interval is 10 seconds. Wait 11 seconds.
      await new Promise((r) => setTimeout(r, 11_000));
    }, 15_000);

    it('replaying the consumed token after grace interval returns 401', async () => {
      const res = await apiFetch('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: consumedToken }),
      });
      expect(res.status).toBe(401);
    });

    it('DB: the entire family is revoked', async () => {
      const rows = await queryDB<{ id: string; revokedAt: string | null }>(
        'SELECT id, "revokedAt" FROM refresh_tokens WHERE family = $1',
        [replayFamily],
      );
      expect(rows.length).toBeGreaterThanOrEqual(2);
      for (const row of rows) {
        expect(row.revokedAt).not.toBeNull();
      }
    });

    it('the successor token is rejected after family revocation', async () => {
      const res = await apiFetch('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: successorToken }),
      });
      expect(res.status).toBe(401);
    });

    it('family revocation was committed — fresh login works on a new family', async () => {
      const loginRes = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: testEmail, password: testPassword }),
      });
      expect(loginRes.status).toBe(200);
      const loginData = await loginRes.json();
      refreshToken = loginData.data.refreshToken;
      accessToken = loginData.data.accessToken;

      // New family is independent
      const refreshRes = await apiFetch('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
      expect(refreshRes.status).toBe(200);
      const refreshData = await refreshRes.json();
      refreshToken = refreshData.data.refreshToken;
      accessToken = refreshData.data.accessToken;
    });
  });
});
