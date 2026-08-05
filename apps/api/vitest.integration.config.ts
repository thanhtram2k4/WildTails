import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: './',
    globals: true,
    include: ['**/*.integration.spec.ts'],
    testTimeout: 30_000,
  },
  plugins: [swc.vite()],
});
