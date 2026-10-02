// El presupuesto por fichero de la suite rápida.
//
// **La suite rápida llegó a tardar 36 minutos en CI sin que ninguna prueba
// fallara** (1 oct 2026): de 15 ficheros que juegan décadas el 16 sep se pasó
// a 58, uno a uno, cada uno razonable por sí solo, y nadie lo vio hasta que la
// CI se cortaba por tiempo (docs/medidas/ci-lentitud-2026-10-02.md). Este
// reportero hace que el primero que se pase salga rojo el día que llega, con su
// nombre, en vez de sumarse en silencio.
//
// Cuenta la recogida además de las pruebas: un fichero que juega sus partidas
// en el cuerpo del `describe` (`ui-milestones` jugaba 189 s así) no lo enseña
// en el tiempo de sus pruebas.
//
// El tope: el fichero más lento de `tests/fast/` tardaba 21 s en local después
// de v5.56 (`life-beasts`, 2 oct 2026); 30 s le dejan un 40 % de margen, y se
// lee a la escala de la máquina (`VALLEY_TIMING_SCALE`, 3 en la CI). Una prueba
// que no quepa **se muda a `tests/journeys/`**, donde los minutos están
// permitidos por diseño (CLAUDE.md); no se sube el tope.

import type { File, Reporter } from 'vitest';
import { budgetMs } from './timing';

/** Lo más que puede tardar un fichero de la suite rápida en el portátil, en ms. */
export const FAST_FILE_BUDGET_MS = 30_000;

export default class FastBudgetReporter implements Reporter {
  onFinished(files: File[] = []): void {
    const budget = budgetMs(FAST_FILE_BUDGET_MS);
    const over = files
      .map((file) => ({
        name: file.name,
        ms: (file.collectDuration ?? 0) + (file.result?.duration ?? 0),
      }))
      .filter((file) => file.ms > budget)
      .sort((a, b) => b.ms - a.ms);
    if (over.length === 0) return;

    console.error(`\nSuite rápida: ${over.length} fichero(s) pasan del presupuesto de `
      + `${(budget / 1000).toFixed(0)} s (recogida + pruebas). Se mudan a tests/journeys/:`);
    for (const file of over) console.error(`  ${(file.ms / 1000).toFixed(1)} s  ${file.name}`);
    process.exitCode = 1;
  }
}
