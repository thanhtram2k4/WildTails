/**
 * Playwright E2E — Auth critical flows.
 *
 * Requires: pnpm exec playwright install chromium
 * Run:      pnpm --filter @wildtails/web test:e2e
 *
 * These tests intercept API calls via page.route() so they can run without a
 * live NestJS backend.
 */

import { test, expect, type Page } from '@playwright/test';

const BASE = 'http://localhost:3100';

async function setupAuthMocks(page: Page, loginSucceeds: boolean) {
  await page.route(`${BASE}/api/auth/csrf`, (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ csrfToken: 'test-csrf-token-abc123' }),
    });
  });

  await page.route(`${BASE}/api/auth/login`, (route) => {
    if (!loginSucceeds) {
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' },
        }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          accessToken: 'mock-access-token',
          expiresIn: 900,
          userId: 'user-uuid-001',
          email: 'test@example.com',
          displayName: 'TestCat',
        },
      }),
    });
  });

  // Silent refresh on mount — return 401 to keep state unauthenticated.
  await page.route(`${BASE}/api/auth/refresh`, (route) => {
    return route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'No refresh token' },
      }),
    });
  });
}

test.describe('Login page', () => {
  test('renders the login form with correct fields', async ({ page }) => {
    await setupAuthMocks(page, true);
    await page.goto(`${BASE}/login`);

    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /create one/i })).toBeVisible();
  });

  test('shows client-side validation errors when form is submitted empty', async ({ page }) => {
    await setupAuthMocks(page, true);
    await page.goto(`${BASE}/login`);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText('Email is required')).toBeVisible();
  });

  test('shows server error message on invalid credentials', async ({ page }) => {
    await setupAuthMocks(page, false);
    await page.goto(`${BASE}/login`);

    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword123');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.locator('[role="alert"]')).toBeVisible();
  });

  test('redirects to /dashboard on successful login', async ({ page }) => {
    await setupAuthMocks(page, true);

    // Stub dashboard API calls.
    await page.route('http://localhost:3000/users/me', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'user-uuid-001',
            email: 'test@example.com',
            displayName: 'TestCat',
            joinedAt: new Date().toISOString(),
          },
        }),
      });
    });
    await page.route('http://localhost:3000/users/me/planets', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.goto(`${BASE}/login`);
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();

    await page.waitForURL(`${BASE}/dashboard`);
    await expect(page).toHaveURL(`${BASE}/dashboard`);
  });

  test('sign in button shows loading state while submitting', async ({ page }) => {
    await page.route(`${BASE}/api/auth/csrf`, (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ csrfToken: 'test-token' }),
      });
    });
    await page.route(`${BASE}/api/auth/login`, async (route) => {
      await page.waitForTimeout(500);
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid' },
        }),
      });
    });
    await page.route(`${BASE}/api/auth/refresh`, (route) => {
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'No token' },
        }),
      });
    });

    await page.goto(`${BASE}/login`);
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByRole('button', { name: /sign in/i })).toBeDisabled();
  });
});

test.describe('Register page', () => {
  test('renders the register form with all fields', async ({ page }) => {
    await setupAuthMocks(page, true);
    await page.route(`${BASE}/api/auth/register`, (route) => {
      return route.fulfill({ status: 200, body: '{}' });
    });

    await page.goto(`${BASE}/register`);

    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();
    await expect(page.getByLabel(/display name/i)).toBeVisible();
    await expect(page.getByLabel(/^email/i)).toBeVisible();
    await expect(page.getByLabel(/^password/i)).toBeVisible();
    await expect(page.getByLabel(/confirm password/i)).toBeVisible();
  });

  test('shows password mismatch error', async ({ page }) => {
    await setupAuthMocks(page, true);
    await page.goto(`${BASE}/register`);

    await page.getByLabel(/display name/i).fill('TestCat');
    await page.getByLabel(/^email/i).fill('test@example.com');
    await page.getByLabel(/^password/i).fill('securepassword');
    await page.getByLabel(/confirm password/i).fill('differentpassword');
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
  });
});

test.describe('CSRF protection', () => {
  test('login request includes x-csrf-token header', async ({ page }) => {
    let capturedCsrfHeader: string | null = null;

    await page.route(`${BASE}/api/auth/csrf`, (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ csrfToken: 'sentinel-token-xyz' }),
      });
    });

    await page.route(`${BASE}/api/auth/login`, (route) => {
      capturedCsrfHeader = route.request().headers()['x-csrf-token'] ?? null;
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid' },
        }),
      });
    });

    await page.route(`${BASE}/api/auth/refresh`, (route) => {
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'No token' },
        }),
      });
    });

    await page.goto(`${BASE}/login`);
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();

    await page.waitForResponse(`${BASE}/api/auth/login`);
    expect(capturedCsrfHeader).toBe('sentinel-token-xyz');
  });
});

test.describe('Accessibility', () => {
  test('login page — all inputs have associated labels', async ({ page }) => {
    await setupAuthMocks(page, true);
    await page.goto(`${BASE}/login`);

    const inputs = page.locator('input:not(.sr-only)');
    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        await expect(label).toBeAttached();
      }
    }
  });

  test('error messages use role=alert', async ({ page }) => {
    await setupAuthMocks(page, false);
    await page.goto(`${BASE}/login`);

    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword123');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.locator('[role="alert"]')).toBeVisible();
  });

  test('login link to register is keyboard-focusable', async ({ page }) => {
    await setupAuthMocks(page, true);
    await page.goto(`${BASE}/login`);

    const link = page.getByRole('link', { name: /create one/i });
    await link.focus();
    await expect(link).toBeFocused();
  });
});
