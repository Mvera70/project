// Lo lento de `tests/fast/era.test.ts`, mudado aquí el 1 oct 2026 (v5.56): el fichero entero
// tardaba 11 s en el trabajo `fast` de CI. Mismo cuerpo y mismo umbral; lo
// barato se queda allí.
//
// A4 · La villa de piedra: la era y la muralla. plan-meta.md, fila A4; §1b.
//
// §1b parte la partida en cuatro fases y hasta A4 dos cosas de esa tabla eran
// papel:
//
//  1 · **La era no existía en ningún sitio.** El juego cumplía las fases sin
//      saber en cuál estaba, así que nada podía decirlo (A5) ni condicionarse
//      a ellas. `derive/era.ts` la lee del estado y no la guarda.
//  2 · **La muralla de piedra era contenido muerto.** `wall` tenía tabla,
//      mejora, dibujo de crónica y ni un solo uso: la única puerta era la
//      encrucijada de la primera piedra (A.16), que **obliga a elegir** entre
//      la muralla y las casas, y medido en doce semillas a ochenta años se
//      desbloquea en diez y **las diez eligen las casas** (+12 de ánimo contra
//      +6 y sin bandera mala). Cero valles con un solo muro de piedra.
//
// Lo que estas pruebas guardan son las propiedades de esas dos cosas, no su
// implementación: qué marca cada era, que una era no vuelve atrás, y que un
// cerco cerrado abre la piedra sin quitarle su otra puerta a la encrucijada.

import { describe, expect, it } from 'vitest';
import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { run } from '@engine/sim';
import { nextUpgrade } from '@engine/world/upgrade';
import type { GameState } from '@engine/state';
import { foundTwenty } from '../helpers/founding';

// La era **jugada** —que no vuelve atrás en cuarenta años de partida— vive en
// `tests/journeys/wall-rings.test.ts`, con el resto de lo que mide el cerco:
// son cuatro partidas y se comían 5,2 de los 20 segundos de la suite rápida.

/** Una aldea de doce años con piedra que picar y su anillo decidido. */
function quarrying(seed = 7): GameState {
  const state = foundTwenty(seed);
  run(state, TIME.WEEKS_PER_YEAR * 12, 'prudent', CATALOG);
  // **RD-3 (1 oct 2026): la primera piedra llega con la piedra.** La pregunta de
  // A.16 sale ahora con la iglesia recién levantada —año 4 a 8— y la política
  // prudente contesta «las casas» (`stone_house_unlocked`), así que una aldea de
  // doce años ya no llega con la piedra sin desbloquear, que es el estado que
  // estas pruebas describen («el estado del juego hasta A4»). Se deshace la
  // respuesta, no la prueba.
  delete state.flags['stone_house_unlocked'];
  state.village.wood = 4_000;
  state.village.stone = 400;
  state.ring = 10;
  return state;
}

/** Mete una pieza de muralla de madera en pie, que es lo que la piedra mejora. */
function palisade(state: GameState, x: number, y: number): void {
  state.buildings.push({
    id: state.buildings.reduce((n, b) => Math.max(n, b.id + 1), 0),
    kind: 'palisade', x, y, w: 1, h: 1,
    builtTick: state.tick, lostTick: null, tier: 0, lit: true, blockedUntil: null,
  });
}

describe('A4 · la muralla de piedra tiene dos puertas', () => {
  it('sin ninguna de las dos, la piedra no se toca', () => {
    const state = quarrying();
    palisade(state, 40, 50);
    // El estado del juego hasta A4 en los doce valles medidos: piedra, madera,
    // anillo, estacas en pie y ni una mejora a la vista.
    expect(nextUpgrade(state), 'sin desbloquear, la piedra no').toBe(null);
  });

  it('un cerco cerrado la abre por sí solo', () => {
    // **La puerta que A4 añade.** Un pueblo que ya tiene su anillo y le sobra
    // piedra no espera a que una encrucijada le pregunte: la dobla.
    const state = quarrying();
    palisade(state, 40, 50);
    state.flags['wall_closed'] = 0;
    expect(nextUpgrade(state), 'el cerco cerrado abre la piedra')
      .toEqual({ kind: 'wall', buildingId: expect.any(Number) });
  });

  it('y la encrucijada sigue abriéndola antes, que es lo que se compra con ella', () => {
    // A4 **añade** un camino, no lo sustituye: la encrucijada de la primera
    // piedra la abre con el valle aún sin cerrar, y eso es exactamente lo que
    // el jugador paga con la bandera de las casas frías.
    const state = quarrying();
    palisade(state, 40, 50);
    state.flags['wall_unlocked'] = 0;
    expect(nextUpgrade(state)?.kind, 'la puerta de A.16 sigue ahí').toBe('wall');
  });

  it('y sin una pieza de madera que mejorar no hay nada que hacer', () => {
    // Una mejora necesita su origen (§7.3 punto 9). Sin esto, «abrir la piedra»
    // sonaría a que la muralla se levanta de la nada, y no: se dobla la que hay.
    const state = quarrying();
    // K1–K3 (1 oct 2026): con el leñador trayendo 3,5 la aldea de doce años ya
    // tiene empalizada, y esta prueba es «sin estacada»: se dice, no se supone.
    for (const b of state.buildings) if (b.kind === 'palisade' && b.lostTick === null) b.lostTick = state.tick;
    state.flags['wall_closed'] = 0;
    expect(nextUpgrade(state), 'sin estacada, nada que doblar').toBe(null);
  });
});
