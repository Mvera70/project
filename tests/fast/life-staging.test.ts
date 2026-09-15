// V-11 · Lo que el motor manda. design.md Anexo E (V-11), §11.8.
//
// §11.8 dice que veinticinco de las cincuenta y seis opciones del catálogo
// convocan a la aldea, y el principio 1 del juego exige que toda opción cambie
// algo en pantalla. Hasta G-11 eso lo cumplía `actorsFor`: el día que había
// reunión, nadie iba al tajo y todos compartían destino.
//
// G-12 puso la capa de vida por defecto y `actorsFor` dejó de ejecutarse. Nadie
// se dio cuenta porque la prueba que vigilaba la reunión llamaba a `actorsFor`
// directamente, así que siguió verde sobre un camino que el juego ya no
// recorría. V-12 borró ese camino y **este fichero se quedó rojo a propósito,
// con la propiedad del brief intacta**, que es lo que `docs/roadmap.md` manda
// hacer con lo que no llega.
//
// **V-11 lo cierra (15 sep 2026):** `life/staging.ts` baja las órdenes del
// motor a la jornada, y una reunión es un `Place` con aforo de aldea, hora fija
// y compañía en vez de deber. Lo que este fichero prueba ahora es que la aldea
// obedece, con los números que se midieron al cerrarlo.

import { foundTwenty } from '../helpers/founding';
import { describe, expect, it } from 'vitest';
import { CATALOG } from '@engine/crossroads/catalog';
import { run } from '@engine/sim';
import type { GameState } from '@engine/state';
import { gatheringsAt } from '@derive/gatherings';
import { createVillage } from '../../src/render3d/life/village';

/**
 * Una decisión con `gather` puesta a mano, para no simular veinte años.
 *
 * `where` elige cuál de los tres sitios de §11.8 convoca, porque los tres tienen
 * geometrías distintas y uno de ellos —la capilla— fue el que destapó el fallo
 * de V-11: el punto que el motor da cae **dentro** del edificio, que para un
 * cuerpo es una pared.
 */
function summon(state: GameState, where: 'chapel' | 'ford' | 'square' = 'chapel'): GameState {
  const called = structuredClone(state);
  for (const template of CATALOG) {
    for (const option of template.options) {
      const calls = option.visible.some((effect) => effect.k === 'gather' && effect.where === where);
      if (!calls) continue;
      called.history.push({
        tick: called.tick, templateId: template.id, optionId: option.id, cast: {},
      });
      return called;
    }
  }
  expect.fail(`el catálogo no tiene ninguna opción que convoque en ${where}`);
}

function village(years: number, seed = 7): GameState {
  const state = foundTwenty(seed);
  run(state, years * 48, 'prudent', CATALOG);
  return state;
}

/** Lo lejos que está del sitio de la reunión el que más lejos está. */
function spread(state: GameState, day: number): number {
  const life = createVillage(state, day);
  // **Dos tercios de la jornada, y antes eran 900 pasos con el comentario
  // «media jornada» al lado**: una jornada son 3 600 pasos (`clock.ts`), así
  // que 900 era un cuarto — y a un cuarto de jornada la gente todavía está
  // andando hacia la reunión. La hora de la reunión es de 0,25 a 0,75.
  while (life.steps < 2400) life.step();
  const [meeting] = gatheringsAt(state, CATALOG, state.tick - 8);
  if (meeting === undefined) return Number.NaN;
  let worst = 0;
  for (const dweller of life.dwellers) {
    worst = Math.max(worst, Math.hypot(dweller.body.x - meeting.x, dweller.body.z - meeting.y));
  }
  return worst;
}

describe('V-11 · la reunión de §11.8 en la capa de vida', () => {
  it('el motor sabe que hay reunión, y dice dónde', () => {
    // La mitad del motor: esto es lo que la vida obedece.
    const called = summon(village(12));
    const meetings = gatheringsAt(called, CATALOG, called.tick - 8);
    expect(meetings.length).toBeGreaterThanOrEqual(1);
    expect(meetings[0]?.x).toBeGreaterThanOrEqual(0);
    expect(meetings[0]?.y).toBeGreaterThanOrEqual(0);
  });

  it('la aldea se junta donde la decisión dijo', () => {
    // **La propiedad del brief, y ahora se cumple.** Lo que se mide es el
    // destino y no la distancia: «ir a la reunión» es una decisión de cada
    // uno, y una reunión de treinta personas ocupa lo que ocupa. Medido al
    // cerrar V-11, cuatro semillas × los tres sitios que §11.8 nombra —la
    // capilla, el vado y la plaza—: entre 22 de 24 y 27 de 35 eligen la
    // reunión, o sea del 77 % al 100 %.
    //
    // Los que faltan no están desobedeciendo: están en una escena —parados
    // hablando, o con un trasto en la mano— y su `doing` es nulo ese instante.
    //
    // El listón va por sitio, con las cuatro semillas juntas: cada muestra es
    // una jornada, y con una jornada no se fija un umbral (CLAUDE.md). Medido
    // tras R-1 con la aldea de veinte: del 89 % al 90 % por sitio, y la peor
    // muestra —la plaza en la semilla 23, la aldea más grande, de 35— 25 de 35.
    // Esa es la que tiene suelo aparte, para que un sitio roto no se esconda
    // detrás de tres buenos.
    for (const where of ['chapel', 'ford', 'square'] as const) {
      let joinedAll = 0;
      let dwellersAll = 0;
      for (const seed of [7, 11, 23, 41]) {
        const called = summon(village(12, seed), where);
        const life = createVillage(called, 0);
        while (life.steps < 2400) life.step();
        const joined = life.dwellers
          .filter((dweller) => dweller.doing?.place.id.startsWith('gather:') === true).length;
        expect(joined / Math.max(1, life.dwellers.length),
          `${where}, semilla ${seed}: ${joined} de ${life.dwellers.length}`)
          .toBeGreaterThanOrEqual(0.6);
        joinedAll += joined;
        dwellersAll += life.dwellers.length;
      }
      expect(joinedAll / Math.max(1, dwellersAll), `${where}: ${joinedAll} de ${dwellersAll}`)
        .toBeGreaterThanOrEqual(0.75);
    }
  });

  it('y la aldea junta cabe en un corro, no en el valle entero', () => {
    // La otra mitad, que es la que se ve: antes de V-11 el más lejano se
    // quedaba a **más de dieciséis celdas** del sitio —cada uno en su campo—.
    // Medido ahora: de 8,0 a 11,3 celdas en las doce combinaciones de arriba,
    // y eso incluye a los que están en una escena por el camino.
    //
    // Catorce es la cota, por encima de lo medido y muy por debajo de lo que
    // daba una aldea que no obedece: si esto se rompe, o la orden no baja o el
    // corro se ha desparramado.
    for (const seed of [7, 23]) {
      const called = summon(village(12, seed));
      expect(spread(called, 0), `semilla ${seed}`).toBeLessThan(14);
    }
  });
});
