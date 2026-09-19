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
    // §14.2. v2.45 lo subió de 10 a 15 minutos; v3.68 a 45, y no por escribir
    // código más lento: **el valle es cuatro veces mayor** (§7, el mapa grande)
    // y un tick cuesta 1,67 veces lo que costaba. Este banco simula 240
    // partidas de doscientos años —cuarenta y ocho mil años de aldea—, así que
    // el reloj sube con el mundo. La cuenta está en §14, con las dos
    // optimizaciones que ya se hicieron para no subirlo más.
    //
    // **Y sube a 60 el 19 sep 2026 (G2), por varianza y no por lentitud.**
    // Tres pasadas del mismo banco en la misma máquina: 31, 31 y **46**
    // minutos, la última corriendo sola. Con el tope en 45 la tercera se lo
    // habría comido a media pasada y habría tirado cuarenta y cinco minutos de
    // simulación sin dejar ni un artefacto. El aserto de duración de
    // `balance.test.ts` sube con él y lleva la medida escrita al lado.
    testTimeout: 3_600_000,
    hookTimeout: 3_600_000,
    reporters: 'default',
  },
});
