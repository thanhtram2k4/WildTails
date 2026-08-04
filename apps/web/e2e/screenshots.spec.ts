/**
 * Phase 03 — Screenshot capture for visual evidence.
 * Run: npx playwright test e2e/screenshots.spec.ts
 */
import { test } from '@playwright/test';
import path from 'node:path';

const BASE = 'http://localhost:3100';
const EVIDENCE_DIR = path.resolve(
  __dirname,
  '../../../docs/evidence/phase-03/onboarding-screenshots',
);

function mockRefresh(page: import('@playwright/test').Page) {
  return page.route(`${BASE}/api/auth/refresh`, (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'No token' },
      }),
    }),
  );
}

test('capture register page', async ({ page }) => {
  await mockRefresh(page);
  await page.goto(`${BASE}/register`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({
    path: path.join(EVIDENCE_DIR, 'register-page.png'),
    fullPage: true,
  });
});

test('capture login page', async ({ page }) => {
  await mockRefresh(page);
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState('networkidle');
  await page.screenshot({
    path: path.join(EVIDENCE_DIR, 'login-page.png'),
    fullPage: true,
  });
});

test('capture onboarding — profile, avatar, planets', async ({ page }) => {
  // Mock auth to appear logged in
  await page.route(`${BASE}/api/auth/refresh`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { accessToken: 'mock-token', expiresIn: 900 },
      }),
    }),
  );

  // Mock user profile for layout
  await page.route('http://localhost:3000/users/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: 'user-001',
          email: 'demo@wildtails.dev',
          displayName: 'Demo Cat',
          joinedAt: new Date().toISOString(),
        },
      }),
    }),
  );

  // Mock planets for onboarding
  await page.route('http://localhost:3000/planets', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          {
            id: '1',
            name: 'Learning',
            slug: 'learning',
            isDefault: true,
            memberCount: 42,
            createdAt: new Date().toISOString(),
          },
          {
            id: '2',
            name: 'Sports',
            slug: 'sports',
            isDefault: true,
            memberCount: 38,
            createdAt: new Date().toISOString(),
          },
          {
            id: '3',
            name: 'Finance',
            slug: 'finance',
            isDefault: true,
            memberCount: 25,
            createdAt: new Date().toISOString(),
          },
          {
            id: '4',
            name: 'Work',
            slug: 'work',
            isDefault: true,
            memberCount: 55,
            createdAt: new Date().toISOString(),
          },
          {
            id: '5',
            name: 'Travel',
            slug: 'travel',
            isDefault: true,
            memberCount: 30,
            createdAt: new Date().toISOString(),
          },
          {
            id: '6',
            name: 'Health',
            slug: 'health',
            isDefault: true,
            memberCount: 47,
            createdAt: new Date().toISOString(),
          },
          {
            id: '7',
            name: 'Pets',
            slug: 'pets',
            isDefault: true,
            memberCount: 63,
            createdAt: new Date().toISOString(),
          },
          {
            id: '8',
            name: 'Art',
            slug: 'art',
            isDefault: true,
            memberCount: 29,
            createdAt: new Date().toISOString(),
          },
        ],
      }),
    }),
  );

  await page.goto(`${BASE}/onboarding`);
  await page.waitForLoadState('networkidle');

  // Step 1: Profile setup
  await page.screenshot({
    path: path.join(EVIDENCE_DIR, 'profile-setup.png'),
    fullPage: true,
  });

  // Click next to avatar builder (step 2)
  const nextBtn = page.getByRole('button', { name: /next|continue/i });
  if (await nextBtn.isVisible()) {
    await nextBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, 'avatar-builder.png'),
      fullPage: true,
    });

    // Click next to planet selection (step 3)
    const next2 = page.getByRole('button', { name: /next|continue/i });
    if (await next2.isVisible()) {
      await next2.click();
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(EVIDENCE_DIR, 'planet-selection.png'),
        fullPage: true,
      });
    }
  }
});

test('capture dashboard', async ({ page }) => {
  await page.route(`${BASE}/api/auth/refresh`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: { accessToken: 'mock-token', expiresIn: 900 },
      }),
    }),
  );
  await page.route('http://localhost:3000/users/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: 'user-001',
          email: 'demo@wildtails.dev',
          displayName: 'Demo Cat',
          avatarConfig: {
            base: 'cat-round',
            fur: 'orange',
            eyes: 'round',
            outfit: 'astronaut',
            accessory: 'glasses',
            background: 'stars',
          },
          joinedAt: new Date().toISOString(),
        },
      }),
    }),
  );
  await page.route('http://localhost:3000/users/me/planets', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          {
            planetId: '1',
            userId: 'user-001',
            role: 'MEMBER',
            joinedAt: new Date().toISOString(),
            leftAt: null,
          },
          {
            planetId: '7',
            userId: 'user-001',
            role: 'MEMBER',
            joinedAt: new Date().toISOString(),
            leftAt: null,
          },
        ],
      }),
    }),
  );
  await page.route('http://localhost:3000/planets', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: [
          {
            id: '1',
            name: 'Learning',
            slug: 'learning',
            isDefault: true,
            memberCount: 42,
            createdAt: new Date().toISOString(),
          },
          {
            id: '7',
            name: 'Pets',
            slug: 'pets',
            isDefault: true,
            memberCount: 63,
            createdAt: new Date().toISOString(),
          },
        ],
      }),
    }),
  );

  await page.goto(`${BASE}/dashboard`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(EVIDENCE_DIR, 'dashboard.png'),
    fullPage: true,
  });
});
