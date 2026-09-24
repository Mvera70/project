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
import { TIME } from '@engine/balance';
import { gatheringsAt } from '@derive/gatherings';
import { createVillage } from '../../src/render3d/life/village';
import { ordersOf } from '../../src/render3d/life/staging';

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

/** La primera jornada de la semana de la decisión: `days` se cuentan desde ahí. */
function firstDay(state: GameState): [GameState, number] {
  return [state, state.tick * TIME.DAYS_PER_WEEK];
}

/** Lo lejos que está del sitio de la reunión el que más lejos está. */
function spread([state, day]: [GameState, number]): number {
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

describe('§11.8 · una reunión dura sus días, no sus semanas', () => {
  it('una convocatoria de n días ocupa n jornadas desde la semana de la decisión', () => {
    // Hasta IA-anim `days` se leía como ticks, y un tick son siete jornadas
    // desde v3.72: «tres días» dejaba a la aldea plantada veintiuna jornadas.
    const state = foundTwenty(7);
    for (const template of CATALOG) {
      for (const option of template.options) {
        const effect = option.visible.find((item) => item.k === 'gather');
        if (effect === undefined || effect.k !== 'gather' || effect.days < 2) continue;
        const called = structuredClone(state);
        called.history.push({ tick: called.tick, templateId: template.id, optionId: option.id, cast: {} });
        const first = called.tick * TIME.DAYS_PER_WEEK;
        for (let day = first; day < first + effect.days; day += 1) expect(ordersOf(called, day), `día ${day - first}`).toHaveLength(1);
        expect(ordersOf(called, first + effect.days)).toHaveLength(0);
        expect(ordersOf(called, first + TIME.DAYS_PER_WEEK - 1)).toHaveLength(0);
        return;
      }
    }
    expect.fail('el catálogo no tiene una reunión de dos días o más');
  });
});

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
    // **IA-anim (24 sep 2026): vuelve al verde, y esta vez arreglado.** Tres
    // causas medidas: el corro daba seis plazas (espiral de cuarenta intentos),
    // el deber a 1,0 contaba como urgencia y dejaba fuera a quien venía de
    // trabajar, y la convocatoria no llegaba más allá de 20 celdas. Con las
    // tres, el vado de la semilla 7 junta 29 de 29 a media jornada (antes 14).
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
    //
    // **B-1 (18 sep 2026): declarada, con lo medido escrito.** El ritmo nuevo
    // hace aldeas de 19 a 70 personas donde antes había de 19 a 25, y esta
    // propiedad **escala mal con el tamaño**: medido en las doce combinaciones,
    // se junta el 54 % de la aldea (244 de 450), y el reparto dice de qué
    // depende — la semilla 23 (19 personas) junta 10, la 7 (25) junta 13 y la
    // 41 (70) junta 28. Cuanto más grande el valle, menor la fracción.
    //
    // Lo que B-1 **sí** arregló, y era un fallo de verdad: con la capilla
    // existiendo por fin (llega a las 47 h de reloj, antes 1 valle de 16 en
    // ochenta años), el corro caía en una bolsa de suelo cerrada entre
    // edificios a la que sólo llegaban 2 de las 6 casas, y `village.ts` lo
    // descartaba entero — **cero de veinticinco**. Ahora `meetingPlace` recibe
    // la orilla y busca el corro en el suelo que la aldea pisa.
    //
    // Lo que falta es del Anexo E y no de un umbral: una reunión de setenta no
    // cabe en un corro de anillos alrededor de un punto. Está anotado en
    // `docs/task-log.md`.
    for (const where of ['chapel', 'ford', 'square'] as const) {
      let joinedAll = 0;
      let dwellersAll = 0;
      for (const seed of [7, 11, 23, 41]) {
        const called = summon(village(12, seed), where);
        const life = createVillage(called, called.tick * TIME.DAYS_PER_WEEK);
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

  it('y la aldea junta cabe en un corro, no en el valle entero (semilla 7)', () => {
    // La otra mitad, que es la que se ve: antes de V-11 el más lejano se
    // quedaba a **más de dieciséis celdas** del sitio —cada uno en su campo—.
    // Medido ahora: de 8,0 a 11,3 celdas en las doce combinaciones de arriba,
    // y eso incluye a los que están en una escena por el camino.
    //
    // Catorce es la cota, por encima de lo medido y muy por debajo de lo que
    // daba una aldea que no obedece: si esto se rompe, o la orden no baja o el
    // corro se ha desparramado.
    // B-1 · **y se queda declarada, porque es la otra cara de lo de arriba.**
    // La cota mide al más lejano de **toda** la aldea, así que mientras se junte
    // la mitad, el más lejano es alguien que sigue en su campo: medido, 22,9
    // celdas en la semilla 7 y 19,1 en la 23. No es que el corro se desparrame
    // —los que llegan llegan— es que no llegan todos. La cota se queda en 14 y
    // sin tocar: moverla sería tapar justamente lo que hay que arreglar.
    expect(spread(firstDay(summon(village(12, 7)))), 'semilla 7').toBeLessThan(14);
  });

  // docs/historico/rework.md §3 (V-02/V-03, el círculo colisiona): con la semilla 23 esto
  // subió de lo medido arriba a 17,98 celdas, y no es la capilla dentro de un
  // muro —esta vez el punto de partida está en suelo abierto de sobra—. Es un
  // mínimo local de `seek()`/`avoid()`: el 29 de esta semilla se detiene en
  // (29,38, 59,81), con la siguiente parada dos celdas y media al este en
  // línea recta y sin nada por medio, y ahí `avoid()` calcula un empujón desde
  // la esquina diagonal de una pared cercana que **cancela casi exactamente**
  // el tirón de `seek()` hacia esa parada — `want` y `wall` quedan a
  // `(1.2227, -0.1804)` y `(-1.2227, 0.1804)`, y con velocidad ya en cero
  // ninguna de las dos fuerzas gana nunca. No es la colisión del círculo (la
  // fila entera por la que tendría que andar está libre) ni una intención sin
  // soltar (`doing.there` es `false`, no ha llegado a ningún sitio): es que
  // dos fuerzas pueden empatar exactas y `drive()` no tiene manera de
  // desempatar. Ya era posible antes de esta ronda —`avoid()` no cambió para
  // este caso— pero las trayectorias que cambian con `integrate`/`resolve`
  // hicieron que alguien pasara por este punto exacto. No es de los tres
  // puntos de este brief (1, 3, 6): arreglarlo es tocar `decide.ts` (que
  // vuelva a pedir ruta si la velocidad se queda en cero pese a tener a dónde
  // ir) o el propio `avoid()`/`seek()` con un desempate determinista, y los
  // dos son terreno de los puntos 2/4 que no le tocan a esta ronda.
  //
  // **B-1 (18 sep 2026): vuelve al verde sola, y no porque se haya arreglado.**
  // El ritmo cambió el reparto de manos y el crecimiento de la aldea, así que
  // la trayectoria de esta semilla ya no pasa por ese punto exacto —el 29 en
  // (29,38, 59,81)— donde `seek()` y `avoid()` se anulaban. El empate sigue
  // siendo posible: lo que hay que arreglar cuando le toque a `decide.ts` es
  // que dos fuerzas puedan cancelarse exactas sin desempate, y eso no lo ha
  // tocado nadie. Deja de estar declarada porque una prueba que espera fallar y
  // pasa es una prueba roja, y el estado de este fichero tiene que decir la
  // verdad (`docs/handover.md`, la lección de v3.79).
  // IA-anim (24 sep 2026): verde con la aldea entera en el corro (ver arriba).
  it('y la aldea junta cabe en un corro, no en el valle entero (semilla 23)', () => {
    expect(spread(firstDay(summon(village(12, 23)))), 'semilla 23').toBeLessThan(14);
  });
});
