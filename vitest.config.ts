// Suite rápida. Debe tardar menos de 20 s (design.md §14.1).
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@engine': fileURLToPath(new URL('./src/engine', import.meta.url)),
      '@render': fileURLToPath(new URL('./src/render', import.meta.url)),
      '@ui': fileURLToPath(new URL('./src/ui', import.meta.url)),
    },
  },
  test: {
    globals: true,
    include: ['tests/fast/**/*.test.ts'],
    testTimeout: 10_000,
    reporters: 'default',
  },
});
