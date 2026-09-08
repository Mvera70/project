// Suite de balance. Simula siglos; se lanza aparte (design.md §14.2).
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: { '@engine': fileURLToPath(new URL('./src/engine', import.meta.url)) },
  },
  test: {
    globals: true,
    include: ['tests/balance/**/*.test.ts'],
    testTimeout: 900_000, // §14.2, v2.45: budget up from 10 to 15 minutes
    hookTimeout: 900_000,
    reporters: 'default',
  },
});
