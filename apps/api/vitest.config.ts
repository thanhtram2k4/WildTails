import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: './',
    globals: true,
    exclude: ['dist/**', 'node_modules/**'],
  },
  plugins: [swc.vite()],
});
