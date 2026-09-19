// M-08 · Cobertura del catálogo. design.md §14.2, Anexo A.
//
// **Contra el juego, no contra un banco.** Esta prueba sustituye a
// `tests/balance/catalog-coverage.test.ts`, que barría 30 semillas × 150 años
// sobre `tests/helpers/catalogue-bench.ts` y **daba muertas plantillas que el
// juego plantea en todos los valles**.
//
// La causa estaba escrita en el propio banco desde el principio: funda con
// **veinte personas en el tick 0** —la aldea de antes de la pareja fundadora,
// 15 sep 2026— y las mantiene ahí, con su propio bucle de tick escrito a mano.
// La premisa que lo justificaba («la partida real tarda siglos en visitar estos
// estados, y el contenido muerto tiene que cazarse por la forma de sus
// condiciones») **caducó**: con la fundación de dos y el ritmo de 4.16, la
// partida real los visita.
//
// Medido el 19 sep 2026 con `foundGame` + `run` y la política prudente:
//
// | banco | mudas |
// |---|---|
// | 8 semillas × 60 años, 21 s | `plague_blame`, `quiet_years` |
// | 12 × 60, 28 s | `plague_blame`, `quiet_years` |
// | **12 × 100, 49 s** | **`quiet_years`** |
// | 24 × 60, 57 s | `plague_blame`, `quiet_years` |
// | 24 × 100, 95 s | `quiet_years` |
//
// Las tres que las dos pruebas viejas daban por muertas o excusaban a mano
// —`chapel_or_granary`, `one_at_the_ford`, `breaking_ground`— salen en 24, 24 y
// 11 valles de 24. No había contenido muerto: había un banco que no es el juego.
//
// **Y vive en las jornadas, no en el banco de balance**, que es la otra mitad
// del arreglo: en `tests/balance/` nadie la corría, porque ese banco cuesta más
// que su propio presupuesto de 45 minutos. Aquí cuesta 49 s de los menos de
// cinco minutos que `CLAUDE.md` le da a las jornadas, y se ejecuta con
// `npm run test:all`.

import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import type { CrossroadCategory } from '@engine/crossroads/schema';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';

/**
 * `quiet_years` es la **reserva de garantía** de §8.6: existe para que nunca
 * haya un silencio largo, y no compite con las demás. Que no salga nunca con
 * el catálogo lleno es su contrato cumpliéndose, no contenido muerto — y es
 * además decisión escrita del dueño del diseño (`task-log.md` §4): «se queda
 * donde está».
 */
const RESERVE = 'quiet_years';

/** Los valles que llegan a ver cada plantilla planteada, jugando de verdad. */
function coverage(seeds: number, years: number): Map<string, number> {
  const valleys = new Map<string, number>();
  for (let seed = 0; seed < seeds; seed += 1) {
    const state = foundGame(seed);
    const here = new Set<string>();
    // Se cuenta la **transición** a planteada y no el tick con una pendiente:
    // una decisión sin contestar se queda semanas en `state.crossroad` (§8.6 no
    // plantea dos), así que contar ticks contaría la espera, no la pregunta.
    let pending: string | null = null;
    for (let week = 0; week < years * TIME.WEEKS_PER_YEAR && state.ended === null; week += 1) {
      run(state, 1, 'prudent', CATALOG);
      const now = state.crossroad?.templateId ?? null;
      if (now !== null && now !== pending) here.add(now);
      pending = now;
    }
    for (const id of here) valleys.set(id, (valleys.get(id) ?? 0) + 1);
  }
  return valleys;
}

describe('M-08 · el catálogo entero llega a plantearse, jugando', () => {
  const seen = coverage(12, 100);

  it('ninguna plantilla se queda a cero, salvo la reserva', () => {
    // Contenido muerto de verdad: condiciones que no se cumplen nunca en una
    // partida. Con veintiuna plantillas escritas a mano es el fallo más fácil
    // de cometer y el más difícil de ver — y el más fácil de diagnosticar mal,
    // que es lo que pasó durante meses.
    const silent = CATALOG.filter((t) => t.id !== RESERVE && (seen.get(t.id) ?? 0) === 0)
      .map((t) => t.id);
    expect(silent, `sin salir nunca: ${silent.join(', ')}`).toEqual([]);
  });

  it('ninguna categoría se queda muda', () => {
    const byCategory = new Set(
      CATALOG.filter((t) => (seen.get(t.id) ?? 0) > 0).map((t) => t.category),
    );
    for (const c of [
      'famine', 'plague', 'lord', 'feud', 'faith', 'forest', 'stranger', 'succession', 'hamlet',
    ] as CrossroadCategory[]) {
      expect(byCategory.has(c), c).toBe(true);
    }
  });

  it('y la reserva sigue siendo reserva', () => {
    // Si `quiet_years` empezara a salir con el catálogo lleno, lo que estaría
    // diciendo es que el resto del catálogo se ha quedado sin condiciones que
    // cumplir. Es el canario, y por eso se afirma su silencio en vez de
    // excusarlo.
    expect(seen.get(RESERVE) ?? 0, 'la reserva ha empezado a salir').toBe(0);
  });
});
