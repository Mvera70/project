// R-1 · El caos es el juego. design.md §7.10; docs/rework.md §2.6.
//
// **Esto vive en las jornadas y no en la suite rápida porque cuesta minutos:**
// doce semillas jugadas cuarenta años cada una con `run` y la política
// prudente. La suite rápida tiene que caber en treinta segundos (`CLAUDE.md`)
// y la primera versión de esta medida se escribió allí por error, dejando la
// puerta del módulo parada varios minutos. Lo barato —que ninguna cifra se
// salga de su rango— se quedó en `tests/fast/fate.test.ts`; lo caro es esto.
//
// Lo que mide es la decisión del dueño del diseño del 15 sep 2026: que un
// valle **pueda** romperse. Hasta v3.75 se exigía lo contrario.

import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import type { GameState } from '@engine/state';

/** Una aldea jugada `years` años como se juega de verdad, o hasta que acaba. */
function played(seed: number, years: number): GameState {
  const state = foundGame(seed);
  for (let y = 0; y < years && state.ended === null; y += 1) {
    run(state, TIME.WEEKS_PER_YEAR, 'prudent', CATALOG);
  }
  return state;
}

describe('el caos es el juego · R-1 §2.6', () => {
  it('el caos es el juego: unos valles se rompen y otros no', () => {
    // Hasta v3.75 esta prueba exigía que las seis semillas llegaran vivas al
    // año treinta, y dos puertas en `weightOf` (`LIGHTNING_MIN_HOUSES`,
    // `LIGHTNING_MIN_PEOPLE`) lo garantizaban quitándole al rayo la única casa
    // de la pareja fundadora. El dueño del diseño dijo después, con estas
    // palabras, que eso es exactamente lo contrario de lo que quiere: «que
    // haya caos y que haya partidas que se rompan y no se pueda seguir
    // jugando es la idea del juego» (`docs/rework.md` §2.6). Las puertas se
    // quitaron: el rayo ya sólo pide tormenta y madera en pie, así que puede
    // quemar la única casa de dos en la semana 1. Lo que esta prueba mide
    // ahora es la propiedad nueva: que un valle se pueda romper, no que nunca
    // se rompa.
    //
    // Medido en doce semillas a cuarenta años, jugadas con `run` y la política
    // prudente: 8 de 12 acaban (6 `abandoned`, 2 `extinction`), las otras 4
    // siguen. La horquilla dejar sitio a que los pesos se muevan sin perder la
    // propiedad: que existan valles que acaban y valles que siguen.
    const seeds = [3, 7, 11, 23, 31, 41, 53, 67, 79, 83, 89, 97];
    const states = seeds.map((seed) => played(seed, 40));
    const finished = states.filter((state) => state.ended !== null);
    const alive = states.filter((state) => state.ended === null);
    expect(finished.length, `acabaron: ${finished.length} de ${seeds.length}`).toBeGreaterThanOrEqual(3);
    expect(finished.length, `acabaron: ${finished.length} de ${seeds.length}`).toBeLessThanOrEqual(11);
    expect(alive.length, `siguen: ${alive.length} de ${seeds.length}`).toBeGreaterThan(0);

    for (const state of states) {
      // La partida que acaba lo cuenta: causa y crónica, no un final mudo.
      if (state.ended !== null) {
        const kind = state.ended.cause === 'extinction' ? 'extinction' : 'abandonment';
        expect(state.chronicle.some((e) => e.kind === kind)).toBe(true);
      }
      // Lo que sigue sin negociarse es la integridad, no la supervivencia:
      // el grano nunca es negativo, el ánimo se queda entre 0 y 100 y las
      // gallinas nunca bajan de cero, rompa el valle o no.
      expect(state.village.grain).toBeGreaterThanOrEqual(0);
      expect(state.village.morale).toBeGreaterThanOrEqual(0);
      expect(state.village.morale).toBeLessThanOrEqual(100);
      expect(state.herd.hens).toBeGreaterThanOrEqual(0);
    }
  });

});
