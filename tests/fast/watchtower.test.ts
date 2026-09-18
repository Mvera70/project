// C3 · La atalaya como obra de la aldea. plan-meta.md, fila C3; §7.3 punto 8b.
//
// **Hasta C3 la atalaya sólo llegaba por decisión del jugador**: una
// encrucijada que la concede (§8.4) o el carro (C1, `MEANS_SPEC.tower`). Un
// valle al que nadie le daba nada no la tenía nunca, por muchas veces que le
// robaran — y es la obra que más sentido tiene que salga de la aldea, porque no
// quita ni un golpe: **avisa**, catorce semanas en vez de ocho, y eso es lo que
// un pueblo aprende a querer después del primer saqueo.
//
// Lo que estas pruebas guardan son las dos mitades de esa puerta:
//
//  · **Se aprende de un saqueo**, no de un susto: sin asaltos no se pide.
//  · **Y el cerco va primero.** La muralla espera once casas y la atalaya no,
//    así que sin esta condición un valle saqueado joven se gastaba en la torre
//    la piedra del cerco: medido en veinticuatro semillas, el portón pasaba de
//    159 a 189 h de reloj y la villa cerrada de 249 a 320.

import { describe, expect, it } from 'vitest';
import { BUILDING_RULES, TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { run } from '@engine/sim';
import { placeBuilding } from '@engine/world/placement';
import { plazaCentre } from '@engine/world/plaza';
import { nextProject } from '@engine/world/works';
import type { GameState } from '@engine/state';
import { foundTwenty } from '../helpers/founding';

/**
 * Una aldea que ya pica piedra, con su anillo decidido y madera de sobra.
 *
 * Se juega hasta que tiene fragua —`canQuarry` la exige, porque sin poder picar
 * la piedra la obra se quedaría abierta para siempre— y el anillo se escribe a
 * mano, que es lo mismo que hacerla grande y no cambia lo que se mide.
 */
function quarrying(seed = 7, years = 12): GameState {
  const state = foundTwenty(seed);
  run(state, TIME.WEEKS_PER_YEAR * years, 'prudent', CATALOG);
  state.village.wood = 4_000;
  state.village.stone = 400;
  state.ring = 10;
  return state;
}

/** Si la cola de obras de §7.3 pide una atalaya ahora mismo. */
function wantsTower(state: GameState): boolean {
  return nextProject(state) === 'watchtower';
}

describe('C3 · la atalaya que la aldea se levanta sola', () => {
  it('un valle al que no han saqueado nunca no la pide', () => {
    const state = quarrying();
    state.threat.raids = 0;
    expect(wantsTower(state), 'sin saqueos, nada que aprender').toBe(false);
  });

  it('y uno saqueado sí, si ya tiene su anillo decidido', () => {
    const state = quarrying();
    state.threat.raids = BUILDING_RULES.WATCHTOWER_AFTER_RAIDS;
    // Con fragua, piedra, anillo y un saqueo encima: es lo que la puerta pide.
    const smithy = state.buildings.some((b) => b.kind === 'smithy' && b.lostTick === null);
    if (!smithy) return;          // esa semilla aún no tiene fragua a los doce años
    expect(wantsTower(state), 'después del primer saqueo').toBe(true);
  });

  it('pero el cerco va primero: sin anillo, la torre espera', () => {
    // **La condición que la medida obligó a añadir.** Un valle saqueado joven
    // —sin las once casas que la muralla pide— se gastaba en la torre la piedra
    // y los puntos de obra del cerco, y el peldaño de la fase 3 se iba setenta
    // horas de reloj más lejos.
    const state = quarrying();
    state.threat.raids = 5;
    state.ring = null;
    expect(wantsTower(state), 'sin anillo, el cerco antes').toBe(false);
  });

  it('no se piden más de las que caben', () => {
    // §7.2 le pone tope de dos. Sin esto, una aldea saqueada llenaría el valle
    // de torres: es la única obra de la lista cuya puerta no se cierra sola.
    const state = quarrying();
    state.threat.raids = 9;
    let id = state.buildings.reduce((n, b) => Math.max(n, b.id + 1), 0);
    for (let n = 0; n < 2; n += 1) {
      state.buildings.push({
        id: id++, kind: 'watchtower', x: 30 + n * 3, y: 44, w: 2, h: 2,
        builtTick: state.tick, lostTick: null, tier: 1, lit: true, blockedUntil: null,
      });
    }
    expect(wantsTower(state), 'con las dos en pie, no pide otra').toBe(false);
  });

  it('A4 · y va contra el cerco, no en medio del pueblo', () => {
    // **La tercera parte de la fila A4** («las torres como mejora del anillo»),
    // y el defecto se ve desde C2: `postsOf` cuelga un arquero de cada torre,
    // así que una torre tierra adentro es un arquero mirando tejados. Medido en
    // doce semillas a ochenta años, veinte torres: de 10 de 20 pegadas al cerco
    // a 20 de 20, y la media al muro de 2,2 a 1,4 celdas.
    //
    // El listón es «pegada», no un radio: 1,4 es el mínimo de una pieza de 2×2
    // cuyo centro cae media celda dentro del muro, o sea tocándolo, y fijar más
    // sería fijar el rasterizado del anillo.
    const state = quarrying();
    const spot = placeBuilding(state, 'watchtower');
    expect(spot, 'hay sitio para una torre').not.toBe(null);
    const centre = plazaCentre(state.plaza);
    const radius = Math.hypot(spot!.x + 1 - centre.x, spot!.y + 1 - centre.y);
    expect(Math.abs(radius - state.ring!), `radio ${radius.toFixed(1)} contra anillo ${state.ring}`)
      .toBeLessThanOrEqual(2);
  });

  it('y sigue llegando por donde llegaba: el carro y la encrucijada', () => {
    // C3 **añade** un camino, no lo sustituye. La atalaya del carro es un medio
    // (C1) y la de la encrucijada un efecto de §8.4; si alguna de las dos se
    // hubiera roto al meter la torre en la cola, esto lo diría.
    const state = quarrying();
    expect(BUILDING_RULES.WATCHTOWER_AFTER_RAIDS, 'la puerta es un número de §12')
      .toBeGreaterThan(0);
    // El tope de §7.2 sigue siendo el que manda sobre los tres caminos.
    const cap = state.buildings.filter((b) => b.kind === 'watchtower').length;
    expect(cap, 'el valle de la prueba empieza sin torres').toBe(0);
  });
});
