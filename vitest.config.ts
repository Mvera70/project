// Suite rápida. Debe tardar menos de 20 s (design.md §14.1).
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import FastBudgetReporter from './tests/helpers/fast-budget-reporter';

export default defineConfig({
  resolve: {
    alias: {
      '@engine': fileURLToPath(new URL('./src/engine', import.meta.url)),
      '@derive': fileURLToPath(new URL('./src/derive', import.meta.url)),
      '@render': fileURLToPath(new URL('./src/render', import.meta.url)),
      '@ui': fileURLToPath(new URL('./src/ui', import.meta.url)),
    },
  },
  test: {
    globals: true,
    include: ['tests/fast/**/*.test.ts'],
    testTimeout: 10_000,
    // **Sin aislar cada fichero** (2 oct 2026, v5.68). Aislado, cada uno de los
    // doscientos ficheros volvía a importar Three, Rapier y el motor, y lo
    // corría con el JIT en frío: 249 s en local, 49 s de recogida y 21 de
    // preparación. Sin aislar, 180–186 s con las 2079 pruebas en verde en el
    // orden de siempre y en dos órdenes barajados (`--sequence.shuffle.files`).
    // Lo que lo permite: el motor guarda sus cachés en `WeakMap` por estado, y
    // ninguna prueba deja nada global detrás. Si una empieza a fallar sólo
    // cuando corre detrás de otra, es esa la que ensucia, y se arregla allí.
    isolate: false,
    reporters: ['default', new FastBudgetReporter()],
  },
});
