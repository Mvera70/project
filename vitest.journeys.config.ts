// Suite de recorridos. Simula jornadas y siglos en varias semillas.
//
// El tercer nivel, entre la suite rápida y el banco de balance. Nació al
// auditar el proyecto: `npm test` prometía menos de 20 s y tardaba 91, y siete
// ficheros se comían la mitad del reloj. No son pruebas lentas por estar mal
// escritas: viven un día escénico entero de ochenta cuerpos en seis semillas, o
// corren cinco mil ticks de motor. Eso vale lo que cuesta, pero no puede estar
// en el bucle de trabajo de cada cambio.
//
// Presupuesto: **menos de tres minutos.** Si sube de ahí, o se reparte en más
// semillas de las que hacen falta o hay algo que medir.
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

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
    include: ['tests/journeys/**/*.test.ts'],
    testTimeout: 120_000,
    reporters: 'default',
  },
});
