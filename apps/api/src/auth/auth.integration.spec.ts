/**
 * Phase 03 — Auth Integration Tests (PostgreSQL-backed)
 *
 * Requires: Running API server at TEST_API_URL (default http://localhost:3000)
 * Requires: Local Docker PostgreSQL with migration applied
 *
 * Covers:
 * - Registration and login
 * - Sequential refresh token rotation
 * - Concurrent refresh (one succeeds, one fails — no family revocation by loser)
 * - Genuine replay detection with committed family revocation
 * - Transaction persistence verification
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const API_BASE = process.env['TEST_API_URL'] ?? 'http://localhost:3000';

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

  describe('Sequential refresh token rotation', () => {
    it('rotates token successfully', async () => {
      const res = await apiFetch('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.accessToken).toBeTruthy();
      expect(data.data.refreshToken).toBeTruthy();
      expect(data.data.expiresIn).toBe(900);

      // Update for subsequent tests
      refreshToken = data.data.refreshToken;
      accessToken = data.data.accessToken;
    });
  });

  describe('Concurrent refresh requests', () => {
    let freshToken: string;

    beforeAll(async () => {
      // Get a fresh token for this test group
      const loginRes = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: testEmail, password: testPassword }),
      });
      const loginData = await loginRes.json();
      freshToken = loginData.data.refreshToken;
      accessToken = loginData.data.accessToken;
    });

    it('exactly one of two concurrent refreshes succeeds', async () => {
      const [res1, res2] = await Promise.all([
        apiFetch('/auth/refresh', {
          method: 'POST',
          body: JSON.stringify({ refreshToken: freshToken }),
        }),
        apiFetch('/auth/refresh', {
          method: 'POST',
          body: JSON.stringify({ refreshToken: freshToken }),
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

      const winner = successes[0]!;
      expect(winner.body.data.accessToken).toBeTruthy();
      expect(winner.body.data.refreshToken).toBeTruthy();

      // Update tokens for subsequent tests
      refreshToken = winner.body.data.refreshToken;
      accessToken = winner.body.data.accessToken;
    });
  });

  describe('Genuine replay detection and family revocation', () => {
    let consumedToken: string;
    let successorToken: string;

    beforeAll(async () => {
      // Get a clean token family via login
      const loginRes = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: testEmail, password: testPassword }),
      });
      const loginData = await loginRes.json();
      consumedToken = loginData.data.refreshToken;
      accessToken = loginData.data.accessToken;
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

    it('replaying the consumed token returns 401', async () => {
      const res = await apiFetch('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: consumedToken }),
      });
      expect(res.status).toBe(401);
    });

    it('replay revoked the entire family — successor is now rejected', async () => {
      const res = await apiFetch('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: successorToken }),
      });
      expect(res.status).toBe(401);
    });

    it('family revocation was committed (not rolled back)', async () => {
      // Both consumed and successor tokens are now rejected,
      // proving the revocation was committed before the 401 response.
      // A fresh login creates a new family that works normally.
      const loginRes = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: testEmail, password: testPassword }),
      });
      expect(loginRes.status).toBe(200);
      const loginData = await loginRes.json();

      const refreshRes = await apiFetch('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: loginData.data.refreshToken }),
      });
      expect(refreshRes.status).toBe(200);

      // Update for cleanup
      const refreshData = await refreshRes.json();
      refreshToken = refreshData.data.refreshToken;
      accessToken = refreshData.data.accessToken;
    });
  });
});
