import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for @wildtails/web.
 *
 * Install: pnpm exec playwright install chromium
 * Run:     pnpm --filter @wildtails/web test:e2e
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3100',
    trace: 'on-first-retry',
    // Respect prefers-reduced-motion in tests.
    reducedMotion: 'reduce',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3100',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
